#!/usr/bin/env bash
# Aplica proxy Nginx + CORS na VPS (PM2 api/web).
# Executar como root na VPS.

set -euo pipefail

FRONT=maisgestao.compumais.com
API_HOST=apimaisgestao.compumais.com
OLD=api.compuchat.space
API=http://127.0.0.1:3333
WEB=http://127.0.0.1:3000
ENV_FILE="/home/deploy/aplicacão/api-mais-gestao/api/.env"
SNIP=/etc/nginx/snippets/mais-gestao-proxy-api.conf
LOC=/etc/nginx/snippets/mais-gestao-web-api-locations.conf
CERT_DIR=/etc/nginx/ssl/mais-gestao
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/mais-gestao-nginx-backup-${STAMP}"

if [ "$(id -u)" -ne 0 ]; then
	echo "Execute como root." >&2
	exit 1
fi

mkdir -p /etc/nginx/snippets "$CERT_DIR" /etc/nginx/sites-available /etc/nginx/sites-enabled "$BACKUP_DIR"
cp -a /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d "$BACKUP_DIR/" 2>/dev/null || true
nginx -T >"$BACKUP_DIR/nginx-T.conf" 2>"$BACKUP_DIR/nginx-T.err" || true
echo "==> Backup: $BACKUP_DIR"

echo "==> Diagnóstico"
ss -lptn | grep -E ':80|:443|:3000|:3333' || true
ls -la /etc/nginx/sites-enabled /etc/nginx/conf.d || true
find /etc/letsencrypt /etc/nginx /etc/ssl -name 'fullchain.pem' -o -name 'privkey.pem' 2>/dev/null | head -40 || true

cat > "$SNIP" <<'EOF'
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

cat > "$LOC" <<EOF
location ^~ /api/preview { proxy_pass ${WEB}; include ${SNIP}; }
location ^~ /api/revalidate { proxy_pass ${WEB}; include ${SNIP}; }
location ^~ /api/exit-preview { proxy_pass ${WEB}; include ${SNIP}; }
location /api/ { proxy_pass ${API}; include ${SNIP}; }
location = /health { proxy_pass ${API}/health; include ${SNIP}; }
location /pdv/updates/ { proxy_pass ${API}; include ${SNIP}; }
EOF

pick_cert() {
	local host="$1"
	if [ -f "/etc/letsencrypt/live/${host}/fullchain.pem" ]; then
		echo "/etc/letsencrypt/live/${host}/fullchain.pem|/etc/letsencrypt/live/${host}/privkey.pem"
		return 0
	fi
	local d
	for d in /etc/letsencrypt/live/*/; do
		[ -f "${d}fullchain.pem" ] || continue
		if openssl x509 -in "${d}fullchain.pem" -noout -text 2>/dev/null | grep -q "DNS:${host}"; then
			echo "${d}fullchain.pem|${d}privkey.pem"
			return 0
		fi
	done
	local pair
	pair="$(nginx -T 2>/dev/null | awk '
		/ssl_certificate / && !/ssl_certificate_key/ { c=$2; gsub(/;/, "", c) }
		/ssl_certificate_key / {
			k=$2; gsub(/;/, "", k)
			if (c && k) { print c "|" k; exit }
		}
	' || true)"
	if [ -n "${pair:-}" ]; then
		echo "$pair"
		return 0
	fi
	local c="${CERT_DIR}/${host}.crt" k="${CERT_DIR}/${host}.key"
	if [ ! -f "$c" ] || [ ! -f "$k" ]; then
		openssl req -x509 -nodes -newkey rsa:2048 -days 90 \
			-keyout "$k" -out "$c" -subj "/CN=${host}" 2>/dev/null
	fi
	echo "${c}|${k}"
}

FRONT_PAIR="$(pick_cert "$FRONT")"
API_PAIR="$(pick_cert "$API_HOST")"
OLD_PAIR="$(pick_cert "$OLD")"
FC="${FRONT_PAIR%%|*}"; FK="${FRONT_PAIR#*|}"
AC="${API_PAIR%%|*}"; AK="${API_PAIR#*|}"
OC="${OLD_PAIR%%|*}"; OK="${OLD_PAIR#*|}"
echo "Front cert: $FC"
echo "API cert: $AC"
echo "Old API cert: $OC"

cat > /etc/nginx/sites-available/maisgestao.compumais.com <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${FRONT};
    client_max_body_size 25m;
    include ${LOC};
    location / { proxy_pass ${WEB}; include ${SNIP}; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${FRONT};
    ssl_certificate ${FC};
    ssl_certificate_key ${FK};
    client_max_body_size 25m;
    include ${LOC};
    location / { proxy_pass ${WEB}; include ${SNIP}; }
}
EOF

cat > /etc/nginx/sites-available/apimaisgestao.compumais.com <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};
    client_max_body_size 25m;
    location / { proxy_pass ${API}; include ${SNIP}; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${API_HOST};
    ssl_certificate ${AC};
    ssl_certificate_key ${AK};
    client_max_body_size 25m;
    location / { proxy_pass ${API}; include ${SNIP}; }
}
EOF

cat > /etc/nginx/sites-available/api.compuchat.space <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${OLD};
    client_max_body_size 25m;
    location / { proxy_pass ${API}; include ${SNIP}; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${OLD};
    ssl_certificate ${OC};
    ssl_certificate_key ${OK};
    client_max_body_size 25m;
    location / { proxy_pass ${API}; include ${SNIP}; }
}
EOF

# Fallback se http2 on falhar (nginx antigo)
if ! nginx -t 2>/dev/null; then
	sed -i '/http2 on;/d; s/listen 443 ssl;/listen 443 ssl http2;/' \
		/etc/nginx/sites-available/maisgestao.compumais.com \
		/etc/nginx/sites-available/apimaisgestao.compumais.com \
		/etc/nginx/sites-available/api.compuchat.space
fi

ln -sfn /etc/nginx/sites-available/maisgestao.compumais.com /etc/nginx/sites-enabled/maisgestao.compumais.com
ln -sfn /etc/nginx/sites-available/apimaisgestao.compumais.com /etc/nginx/sites-enabled/apimaisgestao.compumais.com
ln -sfn /etc/nginx/sites-available/api.compuchat.space /etc/nginx/sites-enabled/api.compuchat.space

python3 - "$ENV_FILE" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
vals = {
	"FRONTEND_URL": "https://maisgestao.compumais.com",
	"CLIENT_ORIGIN": "https://maisgestao.compumais.com",
	"CORS_ORIGINS": "https://maisgestao.compumais.com,https://mais.compuchat.space",
	"API_URL": "https://apimaisgestao.compumais.com",
	"BETTER_AUTH_URL": "https://apimaisgestao.compumais.com",
	"COOKIE_DOMAIN": "compumais.com",
}
text = path.read_text() if path.exists() else ""
lines = text.splitlines()
out = []
seen = set()
for line in lines:
	if "=" not in line:
		out.append(line)
		continue
	raw = line
	prefix = ""
	if line.startswith("export "):
		prefix = "export "
		line = line[len("export ") :]
	key = line.split("=", 1)[0].strip()
	if key in vals and not raw.lstrip().startswith("#"):
		out.append(f"{prefix}{key}={vals[key]}")
		seen.add(key)
	else:
		out.append(raw)
for key, value in vals.items():
	if key not in seen:
		out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
print("env atualizado:", path)
PY

nginx -t
systemctl reload nginx
pm2 reload api-mais-gestao --update-env
sleep 3

echo "==> Verificação"
curl -sS -m 8 -o /dev/null -w "local_health:%{http_code}\n" http://127.0.0.1:3333/health || true

echo "--- Host front /health via 127.0.0.1:80 ---"
curl -sS -m 10 -D - -o /tmp/mg-h.body -H "Host: ${FRONT}" http://127.0.0.1/health | head -20 || true
head -c 200 /tmp/mg-h.body 2>/dev/null; echo

echo "--- Host old OPTIONS via 127.0.0.1:80 ---"
curl -sS -m 10 -D - -o /dev/null -X OPTIONS \
	-H "Host: ${OLD}" \
	-H "Origin: https://${FRONT}" \
	-H "Access-Control-Request-Method: POST" \
	http://127.0.0.1/api/auth/sign-in/email | head -25 || true

echo "--- Host front POST /api/auth/sign-in/email ---"
curl -sS -m 10 -D - -o /tmp/mg-p.body -X POST \
	-H "Host: ${FRONT}" \
	-H "Origin: https://${FRONT}" \
	-H "Content-Type: application/json" \
	--data '{"email":"t@t.com","password":"x"}' \
	http://127.0.0.1/api/auth/sign-in/email | head -25 || true
head -c 300 /tmp/mg-p.body 2>/dev/null; echo

echo "==> DONE. Backup: $BACKUP_DIR"
