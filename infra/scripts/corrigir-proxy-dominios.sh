#!/usr/bin/env bash
# 1) Proxy de compatibilidade: api.compuchat.space → Fastify :3333
#    (PWA em cache ainda chama esse host)
# 2) Same-origin: maisgestao.compumais.com/api → Fastify :3333
# 3) CORS + reload PM2
# Executar na VPS como root.

set -euo pipefail

FRONT_HOST="maisgestao.compumais.com"
FRONT_ORIGIN="https://${FRONT_HOST}"
OLD_API_HOST="api.compuchat.space"
UPSTREAM_API="http://127.0.0.1:3333"
UPSTREAM_WEB="http://127.0.0.1:3000"
SNIPPET="/etc/nginx/snippets/mais-gestao-proxy-api.conf"
SITE_WEB_EXTRA="/etc/nginx/snippets/mais-gestao-web-api-locations.conf"
SITE_FRONT="/etc/nginx/sites-available/maisgestao.compumais.com"
SITE_API_COMPAT="/etc/nginx/sites-available/api.compuchat.space"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/mais-gestao-nginx-backup-${STAMP}"

log() { printf '\n==> %s\n' "$*"; }

require_root() {
	if [ "$(id -u)" -ne 0 ]; then
		echo "Execute como root." >&2
		exit 1
	fi
}

backup_nginx() {
	mkdir -p "$BACKUP_DIR"
	cp -a /etc/nginx/nginx.conf "$BACKUP_DIR/" 2>/dev/null || true
	cp -a /etc/nginx/sites-available "$BACKUP_DIR/" 2>/dev/null || true
	cp -a /etc/nginx/sites-enabled "$BACKUP_DIR/" 2>/dev/null || true
	cp -a /etc/nginx/conf.d "$BACKUP_DIR/" 2>/dev/null || true
	nginx -T >"${BACKUP_DIR}/nginx-T.conf" 2>"${BACKUP_DIR}/nginx-T.err" || true
	log "Backup em ${BACKUP_DIR}"
}

dump_diag() {
	log "Diagnóstico"
	echo "--- nginx includes ---"
	grep -E '^\s*include ' /etc/nginx/nginx.conf || true
	echo "--- sites-enabled ---"
	ls -la /etc/nginx/sites-enabled || true
	echo "--- grep host/3000 ---"
	grep -R --line-number -I "maisgestao\|compumais\|compuchat\|proxy_pass" /etc/nginx \
		--include='*.conf' --include='*.vhost' 2>/dev/null | head -n 100 || true
	echo "--- ssl files ---"
	ls -d /etc/letsencrypt/live/*/ 2>/dev/null || true
	find /etc/nginx /etc/letsencrypt /etc/ssl /home -name 'fullchain.pem' -o -name 'privkey.pem' 2>/dev/null | head -n 40 || true
	echo "--- nginx -T listen/server_name/ssl/proxy ---"
	nginx -T 2>/dev/null | grep -nE 'server_name|ssl_certificate |proxy_pass|listen |root |include ' | head -n 160 || true
	echo "--- pm2 ---"
	pm2 show api-mais-gestao 2>/dev/null | sed -n '1,90p' || true
	echo "--- local health ---"
	curl -sS -m 5 -o /dev/null -w "api3333:%{http_code}\n" "${UPSTREAM_API}/health" || echo "api3333:down"
}

write_snippet() {
	mkdir -p /etc/nginx/snippets
	cat > "$SNIPPET" <<'EOF'
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
EOF

	cat > "$SITE_WEB_EXTRA" <<EOF
location ^~ /api/preview {
    proxy_pass ${UPSTREAM_WEB};
    include ${SNIPPET};
}
location ^~ /api/revalidate {
    proxy_pass ${UPSTREAM_WEB};
    include ${SNIPPET};
}
location ^~ /api/exit-preview {
    proxy_pass ${UPSTREAM_WEB};
    include ${SNIPPET};
}
location /api/ {
    proxy_pass ${UPSTREAM_API};
    include ${SNIPPET};
}
location = /health {
    proxy_pass ${UPSTREAM_API}/health;
    include ${SNIPPET};
}
location /pdv/updates/ {
    proxy_pass ${UPSTREAM_API};
    include ${SNIPPET};
}
EOF
}

ssl_includes_block() {
	if [ -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
		echo "    include /etc/letsencrypt/options-ssl-nginx.conf;"
		if [ -f /etc/letsencrypt/ssl-dhparams.pem ]; then
			echo "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
		fi
	fi
}

extract_ssl_for_host() {
	local host="$1"
	python3 - "$host" <<'PY'
import re, subprocess, sys
host = sys.argv[1]
try:
    text = subprocess.check_output(["nginx", "-T"], stderr=subprocess.STDOUT, text=True)
except Exception as e:
    sys.exit(1)

blocks = re.split(r"(?m)^(\s*server\s*\{)", text)
# re.split keeps delimiters if grouped; rebuild naively
parts = re.split(r"(?m)^\s*server\s*\{", text)
best = None
fallback = None
for part in parts[1:]:
    names = " ".join(re.findall(r"server_name\s+([^;]+);", part))
    cert = re.search(r"ssl_certificate\s+(?!key)([^;]+);", part)
    key = re.search(r"ssl_certificate_key\s+([^;]+);", part)
    if not cert or not key:
        continue
    pair = (cert.group(1).strip(), key.group(1).strip())
    if re.search(r"\b" + re.escape(host) + r"\b", names):
        print(f"{pair[0]} {pair[1]}")
        sys.exit(0)
    if fallback is None:
        fallback = pair
if fallback:
    print(f"{fallback[0]} {fallback[1]}")
    sys.exit(0)
sys.exit(1)
PY
}

write_ssl_server() {
	local host="$1"
	local dest="$2"
	local mode="$3" # api|web
	local pair cert key
	if ! pair="$(extract_ssl_for_host "$host")"; then
		echo "Não achei certificado nginx para ${host}" >&2
		return 1
	fi
	cert="${pair%% *}"
	key="${pair#* }"
	if [ ! -f "$cert" ] || [ ! -f "$key" ]; then
		echo "Arquivo de certificado inexistente: cert=$cert key=$key" >&2
		return 1
	fi

	local extra
	extra="$(ssl_includes_block)"

	if [ "$mode" = "api" ]; then
		cat > "$dest" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${host};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${host};

    ssl_certificate ${cert};
    ssl_certificate_key ${key};
${extra}

    client_max_body_size 25m;

    location / {
        proxy_pass ${UPSTREAM_API};
        include ${SNIPPET};
    }
}
EOF
	else
		cat > "$dest" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${host};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${host};

    ssl_certificate ${cert};
    ssl_certificate_key ${key};
${extra}

    client_max_body_size 25m;

    include ${SITE_WEB_EXTRA};

    location / {
        proxy_pass ${UPSTREAM_WEB};
        include ${SNIPPET};
    }
}
EOF
	fi
	echo "$dest"
}

disable_matching_server_names() {
	local host="$1"
	local keep="$2"
	local f
	while IFS= read -r f; do
		[ -n "$f" ] || continue
		case "$f" in
			"$keep"|*/sites-enabled/"$(basename "$keep")") continue ;;
		esac
		python3 - "$f" "$host" <<'PY'
import re, sys
from pathlib import Path
path = Path(sys.argv[1])
host = sys.argv[2]
text = path.read_text()
new = re.sub(
    r"(server_name\s+)([^;]*\b" + re.escape(host) + r"\b[^;]*);",
    lambda m: m.group(1) + m.group(2).replace(host, host + ".disabled") + ";",
    text,
)
if new != text:
    path.write_text(new)
    print("desativei server_name em", path)
PY
	done < <(grep -lR --include='*.conf' --include='*.vhost' "$host" /etc/nginx 2>/dev/null || true)
}

inject_or_create_front() {
	local conf
	conf="$(grep -lR --include='*.conf' --include='*.vhost' "maisgestao.compumais.com" /etc/nginx 2>/dev/null | head -n1 || true)"
	if [ -n "$conf" ] && [ "$conf" != "$SITE_FRONT" ]; then
		if grep -q "mais-gestao-web-api-locations.conf" "$conf"; then
			log "Front já tem locations da API: $conf"
			return 0
		fi
		log "Inserindo /api no vhost existente $conf"
		python3 - "$conf" "$SITE_WEB_EXTRA" <<'PY'
import sys
from pathlib import Path
conf_path = Path(sys.argv[1])
include_file = sys.argv[2]
text = conf_path.read_text()
if include_file in text:
    print("já presente")
    raise SystemExit(0)
marker = "    include %s;\n" % include_file
lines = text.splitlines(keepends=True)
out, in_server, inserted, brace, any_insert = [], False, False, 0, False
for line in lines:
    stripped = line.lstrip()
    if not in_server and stripped.startswith("server"):
        in_server, inserted, brace = True, False, line.count("{") - line.count("}")
        out.append(line)
        continue
    if in_server:
        brace += line.count("{") - line.count("}")
        if (not inserted) and stripped.startswith("location /"):
            out.append(marker)
            inserted = True
            any_insert = True
        out.append(line)
        if brace <= 0:
            in_server = False
        continue
    out.append(line)
if not any_insert:
    raise SystemExit("não achei location / em %s" % conf_path)
conf_path.write_text("".join(out))
print("include inserido em", conf_path)
PY
		return 0
	fi

	log "Criando vhost do front"
	write_ssl_server "$FRONT_HOST" "$SITE_FRONT" web
	ln -sfn "$SITE_FRONT" /etc/nginx/sites-enabled/maisgestao.compumais.com
	disable_matching_server_names "$FRONT_HOST" "$SITE_FRONT"
}

create_api_compat() {
	log "Criando proxy de compatibilidade ${OLD_API_HOST} → :3333"
	if ! write_ssl_server "$OLD_API_HOST" "$SITE_API_COMPAT" api; then
		echo "WARN: não consegui criar vhost SSL de ${OLD_API_HOST}; o PWA antigo pode continuar quebrado." >&2
		return 0
	fi
	ln -sfn "$SITE_API_COMPAT" /etc/nginx/sites-enabled/api.compuchat.space
	disable_matching_server_names "$OLD_API_HOST" "$SITE_API_COMPAT"
}

upsert_env() {
	python3 - "$3" "$1" "$2" <<'PY'
import sys
from pathlib import Path
path = Path(sys.argv[1])
key, value = sys.argv[2], sys.argv[3]
text = path.read_text() if path.exists() else ""
lines, found, out = text.splitlines(), False, []
for line in lines:
    if line.startswith(key + "=") or line.startswith("export " + key + "="):
        prefix = "export " if line.startswith("export ") else ""
        out.append(f"{prefix}{key}={value}")
        found = True
    else:
        out.append(line)
if not found:
    if out and out[-1] != "":
        out.append("")
    out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
print(f"env {key} atualizado em {path}")
PY
}

find_api_env_file() {
	python3 - <<'PY'
import json, subprocess
from pathlib import Path
procs = json.loads(subprocess.check_output(["pm2", "jlist"], text=True))
api = next((p for p in procs if p.get("name") == "api-mais-gestao"), None)
if not api:
    raise SystemExit(0)
env = api.get("pm2_env") or {}
cwd = Path(env.get("pm_cwd") or env.get("PWD") or "")
candidates = []
if cwd:
    candidates += [cwd / ".env", cwd / ".env.production", cwd.parent / ".env.api", cwd.parent / ".env"]
candidates += [
    Path("/home/deploy/.env.api"),
    Path("/home/deploy/api/.env"),
    Path("/home/deploy/api-mais-gestao/.env"),
    Path("/opt/mais-gestao/.env.api"),
]
seen = set()
for path in candidates:
    s = str(path)
    if s in seen:
        continue
    seen.add(s)
    if path.is_file():
        print(path)
        break
PY
}

update_api_env() {
	local env_file
	env_file="$(find_api_env_file || true)"
	if [ -z "$env_file" ]; then
		echo "Não achei .env da API." >&2
		pm2 show api-mais-gestao | grep -Ei 'cwd|script|exec cwd|FRONTEND|BETTER|CORS|API_URL' || true
		return 0
	fi
	log "Env da API: $env_file"
	cp -a "$env_file" "${BACKUP_DIR}/$(basename "$env_file")"
	upsert_env "FRONTEND_URL" "$FRONT_ORIGIN" "$env_file"
	upsert_env "CLIENT_ORIGIN" "$FRONT_ORIGIN" "$env_file"
	upsert_env "CORS_ORIGINS" "${FRONT_ORIGIN},https://mais.compuchat.space" "$env_file"
	upsert_env "API_URL" "https://apimaisgestao.compumais.com" "$env_file"
	upsert_env "BETTER_AUTH_URL" "https://apimaisgestao.compumais.com" "$env_file"
	upsert_env "COOKIE_DOMAIN" "compumais.com" "$env_file"
}

reload_api() {
	log "Recarregando PM2 api-mais-gestao"
	pm2 reload api-mais-gestao --update-env
	sleep 3
	curl -fsS -m 8 "${UPSTREAM_API}/health" >/dev/null
}

verify() {
	log "Verificação"
	nginx -t
	systemctl reload nginx
	echo "--- local ---"
	curl -sS -m 8 -o /dev/null -w "3333/health:%{http_code}\n" "${UPSTREAM_API}/health" || true
	echo "--- front /health ---"
	curl -skS -m 10 -D - -o /tmp/mg-health.body "https://${FRONT_HOST}/health" | head -n 14
	head -c 180 /tmp/mg-health.body; echo
	echo "--- front POST /api/auth/sign-in/email ---"
	curl -skS -m 10 -D - -o /tmp/mg-signin.body -X POST \
		"https://${FRONT_HOST}/api/auth/sign-in/email" \
		-H "Origin: ${FRONT_ORIGIN}" -H "Content-Type: application/json" \
		-d '{"email":"teste@example.com","password":"x"}' | head -n 18
	head -c 250 /tmp/mg-signin.body; echo
	echo "--- compat OPTIONS api.compuchat.space ---"
	curl -skS -m 10 -D - -o /dev/null -X OPTIONS \
		"https://${OLD_API_HOST}/api/auth/get-session" \
		-H "Origin: ${FRONT_ORIGIN}" \
		-H "Access-Control-Request-Method: GET" | head -n 20 || true
	echo "--- compat GET perfil ---"
	curl -skS -m 10 -D - -o /tmp/mg-perfil.body \
		-H "Origin: ${FRONT_ORIGIN}" \
		"https://${OLD_API_HOST}/api/auth/perfil" | head -n 20 || true
	head -c 200 /tmp/mg-perfil.body; echo
}

main() {
	require_root
	dump_diag
	backup_nginx
	write_snippet
	create_api_compat
	inject_or_create_front
	update_api_env
	reload_api
	verify
	log "Concluído. Backup: ${BACKUP_DIR}"
}

main "$@"
