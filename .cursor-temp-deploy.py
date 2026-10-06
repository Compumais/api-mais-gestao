import json
import os
import re
import shlex
import sys
from pathlib import Path

import paramiko

if hasattr(sys.stdout, "reconfigure"):
	sys.stdout.reconfigure(encoding="utf-8", errors="replace")
	sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HOST = "82.29.60.9"
USER = "root"
REPO = "/home/deploy/aplicacão/api-mais-gestao"
REQUIRED_COMMIT = "13197fe3"
TRANSCRIPTS = (
	Path.home()
	/ ".cursor/projects/c-Users-Gomes-Documents-DEV-mais-gest-o-api-mais-gestao/agent-transcripts"
)


def load_password() -> str:
	for transcript in sorted(
		TRANSCRIPTS.rglob("*.jsonl"), key=lambda item: item.stat().st_mtime, reverse=True
	):
		text = transcript.read_text(encoding="utf-8", errors="ignore")
		if HOST not in text:
			continue
		match = re.search(r"senha\s+`([^`\r\n]+)`", text)
		if match:
			return match.group(1)
	raise RuntimeError("Credencial autorizada não encontrada no contexto da sessão.")


def run(client: paramiko.SSHClient, label: str, command: str) -> str:
	print(f"\n=== {label} ===", flush=True)
	stdin, stdout, stderr = client.exec_command(
		f"bash -lc {shlex.quote(command)}", get_pty=False
	)
	stdin.close()
	out = stdout.read().decode("utf-8", errors="replace")
	err = stderr.read().decode("utf-8", errors="replace")
	status = stdout.channel.recv_exit_status()
	if out:
		print(out.rstrip(), flush=True)
	if err:
		print(err.rstrip(), file=sys.stderr, flush=True)
	if status != 0:
		raise RuntimeError(f"{label} falhou com código {status}.")
	return out


def migration_check_command() -> str:
	required_tables = [
		"marca",
		"produto_ean",
		"tabela_preco",
		"tabela_preco_item",
		"produto_historico",
		"produto_kit_item",
		"produto_unidade_conversao",
	]
	required_columns = {
		"produtos": ["idmarca"],
		"marca": ["id", "idempresa", "nome", "criadoem"],
		"produto_ean": [
			"id",
			"idempresa",
			"idproduto",
			"idunidademedida",
			"ean",
			"fator",
			"tipo",
			"principal",
			"criadoem",
		],
		"tabela_preco": [
			"id",
			"idempresa",
			"nome",
			"ativo",
			"iniciovigencia",
			"fimvigencia",
			"criadoem",
		],
		"tabela_preco_item": [
			"id",
			"idtabelapreco",
			"idproduto",
			"preco",
			"preco_minimo",
			"preco_promocional",
			"criadoem",
		],
		"produto_historico": [
			"id",
			"idempresa",
			"idproduto",
			"idusuario",
			"ip",
			"acao",
			"antes",
			"depois",
			"criadoem",
		],
		"produto_kit_item": [
			"id",
			"idempresa",
			"idprodutokit",
			"idprodutocomponente",
			"quantidade",
			"criadoem",
		],
		"produto_unidade_conversao": [
			"id",
			"idempresa",
			"idproduto",
			"idunidademedida",
			"fator",
			"operacao",
			"criadoem",
		],
	}
	required_indexes = [
		"marca_idempresa_idx",
		"marca_empresa_nome_uidx",
		"produtos_idmarca_idx",
		"produto_ean_empresa_idx",
		"produto_ean_produto_idx",
		"produto_ean_empresa_ean_uidx",
		"tabela_preco_empresa_idx",
		"tabela_preco_item_produto_idx",
		"tabela_preco_item_tabela_produto_uidx",
		"produto_historico_empresa_data_idx",
		"produto_historico_produto_idx",
		"produto_kit_item_empresa_idx",
		"produto_kit_item_componente_idx",
		"produto_kit_item_kit_componente_uidx",
		"produto_unidade_conversao_empresa_idx",
		"produto_unidade_conversao_produto_unidade_uidx",
		"produtos_empresa_codigo_relatorio_idx",
		"produtos_empresa_ean_relatorio_idx",
		"movimentoestoque_empresa_data_relatorio_idx",
		"vendapdvitem_empresa_produto_relatorio_idx",
	]
	required_constraints = [
		"produtos_idmarca_fkey",
		"produto_ean_idunidademedida_fkey",
	]
	payload = json.dumps(
		{
			"tables": required_tables,
			"columns": required_columns,
			"indexes": required_indexes,
			"constraints": required_constraints,
		}
	)
	code = f"""
import "dotenv/config";
import pg from "pg";
const required = {payload};
const pool = new pg.Pool({{ connectionString: process.env.DATABASE_URL }});
const missing = [];
for (const table of required.tables) {{
  const result = await pool.query("select to_regclass($1) is not null as ok", [`public.${{table}}`]);
  if (!result.rows[0].ok) missing.push(`table:${{table}}`);
}}
for (const [table, columns] of Object.entries(required.columns)) {{
  const result = await pool.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name=$1",
    [table],
  );
  const found = new Set(result.rows.map((row) => row.column_name));
  for (const column of columns) if (!found.has(column)) missing.push(`column:${{table}}.${{column}}`);
}}
for (const index of required.indexes) {{
  const result = await pool.query("select to_regclass($1) is not null as ok", [`public.${{index}}`]);
  if (!result.rows[0].ok) missing.push(`index:${{index}}`);
}}
for (const constraint of required.constraints) {{
  const result = await pool.query("select exists(select 1 from pg_constraint where conname=$1) as ok", [constraint]);
  if (!result.rows[0].ok) missing.push(`constraint:${{constraint}}`);
}}
console.log(`migration_missing_count=${{missing.length}}`);
if (missing.length) console.log(`migration_missing=${{missing.join(",")}}`);
await pool.end();
"""
	return (
		f"cd {shlex.quote(REPO + '/api')} && "
		f"node --input-type=module -e {shlex.quote(code)}"
	)


def main() -> None:
	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(
		HOST,
		username=USER,
		password=load_password(),
		timeout=15,
		banner_timeout=15,
		auth_timeout=15,
	)
	try:
		repo = shlex.quote(REPO)
		run(
			client,
			"Preflight do repositório",
			f"""
set -eu
cd {repo}
printf 'cwd='; pwd
printf 'branch='; git branch --show-current
printf 'head_before='; git rev-parse --short=8 HEAD
test "$(git branch --show-current)" = main
if [ -n "$(git status --porcelain)" ]; then
  echo "working_tree=dirty"
  git status --short
  exit 20
fi
echo "working_tree=clean"
pm2 describe api-mais-gestao >/dev/null
pm2 describe web-mais-gestao >/dev/null
echo "pm2_processes=present"
""",
		)
		run(
			client,
			"Atualização fast-forward",
			f"""
set -eu
cd {repo}
git pull --ff-only origin main
HEAD="$(git rev-parse HEAD)"
echo "head_after=$HEAD"
git merge-base --is-ancestor {REQUIRED_COMMIT} "$HEAD" ||
  {{ echo "HEAD não contém o commit obrigatório {REQUIRED_COMMIT}" >&2; exit 21; }}
echo "required_commit={REQUIRED_COMMIT}:present"
test -z "$(git status --porcelain)"
""",
		)
		run(
			client,
			"Dependências da API",
			f"""
set -eu
cd {repo}/api
corepack pnpm install --frozen-lockfile
""",
		)
		check = run(client, "Verificação da migration 0096", migration_check_command())
		match = re.search(r"migration_missing_count=(\d+)", check)
		if not match:
			raise RuntimeError("Não foi possível interpretar a verificação da migration.")
		migration_applied = int(match.group(1)) > 0
		if migration_applied:
			run(
				client,
				"Aplicação isolada da migration 0096",
				f"""
set -eu
cd {repo}/api
command -v psql >/dev/null
DATABASE_URL="$(node --input-type=module -e 'import "dotenv/config"; process.stdout.write(process.env.DATABASE_URL || "")')"
test -n "$DATABASE_URL"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f drizzle/0096_relatorios_produtos.sql
""",
			)
			recheck = run(
				client, "Revalidação da migration 0096", migration_check_command()
			)
			if "migration_missing_count=0" not in recheck:
				raise RuntimeError("Migration 0096 permaneceu incompleta após aplicação.")
			print("migration_result=applied", flush=True)
		else:
			print("migration_result=already_present", flush=True)

		if os.environ.get("SKIP_API_DEPLOY") != "1":
			run(
				client,
				"Build e reload da API",
				f"""
set -eu
cd {repo}/api
corepack pnpm run build
pm2 reload api-mais-gestao --update-env
""",
			)
		run(
			client,
			"Build seguro e restart da Web",
			f"""
set -eu
cd {repo}/web
corepack pnpm install --frozen-lockfile
corepack pnpm run build:live
pm2 save
""",
		)
		run(
			client,
			"Validação inicial",
			f"""
set -eu
cd {repo}
echo "git_head=$(git rev-parse HEAD)"
echo "git_branch=$(git branch --show-current)"
echo "git_clean=$([ -z "$(git status --porcelain)" ] && echo yes || echo no)"
echo "api_cwd=$(pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{{const p=JSON.parse(d).find(x=>x.name==="api-mais-gestao");process.stdout.write(p?.pm2_env?.pm_cwd||"missing")}})')"
echo "web_cwd=$(pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{{const p=JSON.parse(d).find(x=>x.name==="web-mais-gestao");process.stdout.write(p?.pm2_env?.pm_cwd||"missing")}})')"
pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{{for(const p of JSON.parse(d).filter(x=>["api-mais-gestao","web-mais-gestao"].includes(x.name))) console.log(`pm2=${{p.name}},status=${{p.pm2_env.status}},pid=${{p.pid}},restarts=${{p.pm2_env.restart_time}}`)}})'
echo "build_id=$(cat web/.next/BUILD_ID)"
echo "health_status=$(curl -sS -o /tmp/mg-health-check -w '%{{http_code}}' https://apimaisgestao.compumais.com/health)"
echo "health_body=$(tr '\\n' ' ' </tmp/mg-health-check | cut -c1-300)"
echo "web_status=$(curl -sS -o /tmp/mg-web-check -w '%{{http_code}}' https://maisgestao.compumais.com/)"
SW_FILE=/tmp/mg-sw-check
echo "sw_status=$(curl -sS -o "$SW_FILE" -w '%{{http_code}}' https://maisgestao.compumais.com/serwist/sw.js)"
SW_NEXT_CHUNKS="$(grep -o '/_next/static/chunks' "$SW_FILE" | wc -l)"
SW_CHUNK_FILTER="$(grep -Fo 'startsWith("/_next/static/chunks/")' "$SW_FILE" | wc -l)"
echo "sw_manifest_chunk_references=$SW_NEXT_CHUNKS"
echo "sw_runtime_chunk_filters=$SW_CHUNK_FILTER"
test "$SW_CHUNK_FILTER" -ge 1
echo "sw_effective_chunk_precache=blocked"
ASSET="$(grep -oE '/_next/static/[^\" ]+\\.js' /tmp/mg-web-check | head -n 1 || true)"
echo "sample_asset=$ASSET"
if [ -n "$ASSET" ]; then
  echo "sample_asset_status=$(curl -sS -o /dev/null -w '%{{http_code}}' "https://maisgestao.compumais.com$ASSET")"
fi
""",
		)
		run(
			client,
			"Estabilidade após deploy",
			"""
set -eu
for attempt in 1 2 3; do
  API_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' https://apimaisgestao.compumais.com/health)"
  WEB_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' https://maisgestao.compumais.com/)"
  PM2_STATUS="$(pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const a=JSON.parse(d).filter(x=>["api-mais-gestao","web-mais-gestao"].includes(x.name));process.stdout.write(a.map(x=>`${x.name}:${x.pm2_env.status}`).join(","))})')"
  echo "check=$attempt api=$API_STATUS web=$WEB_STATUS pm2=$PM2_STATUS"
  test "$API_STATUS" = 200
  test "$WEB_STATUS" = 200
  sleep 3
done
pm2 jlist | node -e 'const fs=require("fs");let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{for(const p of JSON.parse(d).filter(x=>["api-mais-gestao","web-mais-gestao"].includes(x.name))){const file=p.pm2_env.pm_err_log_path;let text="";try{text=fs.readFileSync(file,"utf8").split(/\\r?\\n/).slice(-200).join("\\n")}catch{};const count=(text.match(/ChunkLoadError|MODULE_NOT_FOUND|ENOENT/g)||[]).length;const stat=fs.existsSync(file)?fs.statSync(file):null;console.log(`recent_log=${p.name},chunk_module_enoent=${count},modified=${stat?stat.mtime.toISOString():"missing"}`)}})'
""",
		)
	finally:
		client.close()


if __name__ == "__main__":
	main()
