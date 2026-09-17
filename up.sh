#!/usr/bin/env bash
# Sobe API + Web na VPS com build completo (evita Next.js antigo no ar).
#
# Rodar NA VPS, no clone do monorepo, depois do push em main:
#   cd /caminho/do/clone   # ex.: /home/deploy/aplicacão/api-mais-gestao
#   ./up.sh
#
# Fluxo: pull ff-only → deps API → migrations → build+reload API → deps Web →
# build:live (next build em staging + publica .next + restart web-mais-gestao).
# Não publica PDV/POS/Android. Não grava senha. Não altera .env.
#
# Opcional: SKIP_PULL=1  SKIP_MIGRATE=1  MIGRATE_SQL=api/drizzle/XXXX.sql
#           ALLOW_BRANCH=1  COMPOSE_FILE=/opt/mais-gestao/docker-compose.prod.yml

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

API_PM2="${API_PM2:-api-mais-gestao}"
WEB_PM2="${WEB_PM2:-web-mais-gestao}"
API_HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3333/health}"
WEB_CHECK_URL="${WEB_CHECK_URL:-http://127.0.0.1:3000/}"
BRANCH_PADRAO="main"

log() { printf '\n==> %s\n' "$*"; }
ok() { printf '    OK  %s\n' "$*"; }
warn() { printf '    AVISO  %s\n' "$*" >&2; }
die() { printf 'ERRO: %s\n' "$*" >&2; exit 1; }

precisa() {
	command -v "$1" >/dev/null 2>&1 || die "Comando '$1' não encontrado no PATH."
}

pnpm_run() {
	if command -v pnpm >/dev/null 2>&1; then
		pnpm "$@"
	elif command -v corepack >/dev/null 2>&1; then
		corepack pnpm "$@"
	else
		die "pnpm não encontrado. Instale Node 20 e rode: corepack enable"
	fi
}

pm2_existe() {
	command -v pm2 >/dev/null 2>&1 && pm2 describe "$1" >/dev/null 2>&1
}

achar_compose() {
	if [[ -n "${COMPOSE_FILE:-}" && -f "$COMPOSE_FILE" ]]; then
		printf '%s\n' "$COMPOSE_FILE"
		return 0
	fi
	local candidato
	for candidato in \
		"$ROOT/docker-compose.prod.yml" \
		"${ROOT%/*}/docker-compose.prod.yml" \
		"/opt/mais-gestao/docker-compose.prod.yml"
	do
		if [[ -f "$candidato" ]]; then
			printf '%s\n' "$candidato"
			return 0
		fi
	done
	return 1
}

esperar_http() {
	local url="$1" nome="$2" tentativas="${3:-30}" i codigo
	for ((i = 1; i <= tentativas; i++)); do
		codigo="$(curl -sS -o /dev/null -w '%{http_code}' -m 5 "$url" || true)"
		if [[ "$codigo" == "200" ]]; then
			ok "$nome respondeu 200 em $url"
			return 0
		fi
		sleep 2
	done
	die "$nome não ficou saudável em $url (último HTTP: ${codigo:-n/a})"
}

atualizar_codigo() {
	if [[ "${SKIP_PULL:-}" == "1" ]]; then
		log "Pulando git pull (SKIP_PULL=1)"
		return 0
	fi

	precisa git
	log "Atualizando código"
	local branch
	branch="$(git branch --show-current)"
	if [[ "$branch" != "$BRANCH_PADRAO" && "${ALLOW_BRANCH:-}" != "1" ]]; then
		die "Branch atual é '$branch'. Troque para $BRANCH_PADRAO ou use ALLOW_BRANCH=1."
	fi
	if [[ -n "$(git status --porcelain)" ]]; then
		git status --short
		die "Working tree suja. Commit ou stash antes de subir."
	fi
	git fetch origin "$branch"
	git pull --ff-only origin "$branch"
	ok "HEAD $(git rev-parse --short=8 HEAD) ($branch)"
}

instalar_api() {
	log "Dependências da API"
	[[ -d "$ROOT/api" ]] || die "Pasta api/ não encontrada em $ROOT"
	(
		cd "$ROOT/api"
		pnpm_run install --frozen-lockfile
	)
}

resolver_caminho() {
	local arquivo="$1"
	if [[ "$arquivo" == /* ]]; then
		printf '%s\n' "$arquivo"
	else
		printf '%s\n' "$ROOT/$arquivo"
	fi
}

aplicar_sql() {
	local arquivo caminho url
	arquivo="$1"
	caminho="$(resolver_caminho "$arquivo")"
	[[ -f "$caminho" ]] || die "Arquivo de migration não encontrado: $caminho"
	log "Aplicando SQL $caminho"
	(
		cd "$ROOT/api"
		url="$(node --input-type=module -e 'import "dotenv/config"; process.stdout.write(process.env.DATABASE_URL || "")')"
		[[ -n "$url" ]] || die "DATABASE_URL ausente em api/.env; não aplico SQL sem credencial do ambiente."
		precisa psql
		psql "$url" -v ON_ERROR_STOP=1 --single-transaction -f "$caminho"
	)
}

migrar() {
	if [[ "${SKIP_MIGRATE:-}" == "1" ]]; then
		log "Migrations puladas (SKIP_MIGRATE=1)"
		return 0
	fi

	log "Status das migrations"
	(
		cd "$ROOT/api"
		pnpm_run run db:migrate:status || warn "Não foi possível listar o status das migrations."
	)

	if [[ -n "${MIGRATE_SQL:-}" ]]; then
		aplicar_sql "$MIGRATE_SQL"
		return 0
	fi

	log "Aplicando migrations pendentes (db:migrate:producao)"
	(
		cd "$ROOT/api"
		pnpm_run run db:migrate:producao
	)
}

subir_api_pm2() {
	log "Build da API"
	(
		cd "$ROOT/api"
		pnpm_run run build
	)
	log "Reload PM2 $API_PM2"
	pm2 reload "$API_PM2" --update-env
	esperar_http "$API_HEALTH_URL" "API"
}

subir_api_docker() {
	local compose="$1"
	precisa docker
	log "API via Docker Compose ($compose)"
	docker compose -f "$compose" up -d postgres
	docker compose -f "$compose" exec -T postgres \
		sh -c 'until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do sleep 2; done'
	docker compose -f "$compose" pull api
	docker compose -f "$compose" up -d api
	esperar_http "$API_HEALTH_URL" "API"
}

subir_api() {
	if pm2_existe "$API_PM2"; then
		instalar_api
		migrar
		subir_api_pm2
		return 0
	fi

	local compose
	if compose="$(achar_compose)"; then
		warn "PM2 $API_PM2 não encontrado — usando Docker Compose."
		if [[ -d "$ROOT/api" ]]; then
			instalar_api
			migrar
		fi
		subir_api_docker "$compose"
		return 0
	fi

	die "API não encontrada (PM2 $API_PM2 nem docker-compose.prod.yml)."
}

instalar_web() {
	log "Dependências da Web"
	[[ -d "$ROOT/web" ]] || die "Pasta web/ não encontrada em $ROOT"
	(
		cd "$ROOT/web"
		pnpm_run install --frozen-lockfile
	)
}

subir_web() {
	precisa pm2
	instalar_web
	if pm2_existe "$WEB_PM2"; then
		log "Build live da Web (next build + publica .next + restart $WEB_PM2)"
		(
			cd "$ROOT/web"
			pnpm_run run build:live
		)
	else
		warn "Processo PM2 $WEB_PM2 não existe — primeiro start (bootstrap)."
		(
			cd "$ROOT/web"
			pnpm_run run build
			pm2 start "pnpm start -- -p 3000" --name "$WEB_PM2"
		)
	fi
	pm2 save
	esperar_http "$WEB_CHECK_URL" "Web"
}

validar() {
	log "Validação"
	printf '    git_head=%s\n' "$(git rev-parse HEAD)"
	printf '    git_branch=%s\n' "$(git branch --show-current)"
	if [[ -f "$ROOT/web/.next/BUILD_ID" ]]; then
		printf '    web_build_id=%s\n' "$(cat "$ROOT/web/.next/BUILD_ID")"
	else
		die "web/.next/BUILD_ID ausente — o Next não foi publicado."
	fi
	pm2 describe "$API_PM2" >/dev/null 2>&1 && ok "PM2 $API_PM2 presente" || warn "PM2 $API_PM2 ausente"
	pm2 describe "$WEB_PM2" >/dev/null
	ok "PM2 $WEB_PM2 presente"
	ok "Deploy completo. API e Web foram reconstruídos nesta ordem."
}

main() {
	precisa curl
	log "Mais Gestão — subida completa em $ROOT"
	atualizar_codigo
	subir_api
	subir_web
	validar
}

main "$@"
