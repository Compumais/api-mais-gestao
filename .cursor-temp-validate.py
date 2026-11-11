import importlib.util
from pathlib import Path

import paramiko

helper_path = Path(__file__).with_name(".cursor-temp-deploy.py")
spec = importlib.util.spec_from_file_location("deploy_helper", helper_path)
helper = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(helper)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
	helper.HOST,
	username=helper.USER,
	password=helper.load_password(),
	timeout=15,
	banner_timeout=15,
	auth_timeout=15,
)
try:
	helper.run(
		client,
		"Validação final de produção",
		f"""
set -eu
cd '{helper.REPO}'
echo "git_head=$(git rev-parse HEAD)"
echo "git_branch=$(git branch --show-current)"
echo "git_clean=$([ -z "$(git status --porcelain)" ] && echo yes || echo no)"
echo "build_id=$(cat web/.next/BUILD_ID)"
pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{{for(const p of JSON.parse(d).filter(x=>["api-mais-gestao","web-mais-gestao"].includes(x.name))) console.log(`pm2=${{p.name}},status=${{p.pm2_env.status}},pid=${{p.pid}},uptime_ms=${{Date.now()-p.pm2_env.pm_uptime}},restarts=${{p.pm2_env.restart_time}},cwd=${{p.pm2_env.pm_cwd}}`)}})'
for attempt in 1 2 3; do
  API_STATUS="$(curl -sS -o /tmp/mg-health-final -w '%{{http_code}}' https://apimaisgestao.compumais.com/health)"
  WEB_STATUS="$(curl -sS -o /tmp/mg-web-final -w '%{{http_code}}' https://maisgestao.compumais.com/)"
  SW_STATUS="$(curl -sS -H 'Cache-Control: no-cache' -o /tmp/mg-sw-final -w '%{{http_code}}' 'https://maisgestao.compumais.com/serwist/sw.js?final=9aff8823')"
  echo "check=$attempt api=$API_STATUS web=$WEB_STATUS sw=$SW_STATUS"
  test "$API_STATUS" = 200
  test "$WEB_STATUS" = 200
  test "$SW_STATUS" = 200
  sleep 3
done
echo "health_body=$(tr '\\n' ' ' </tmp/mg-health-final | cut -c1-300)"
SW_REFS="$(grep -o '/_next/static/chunks' /tmp/mg-sw-final | wc -l)"
SW_FILTERS="$(grep -Fo 'startsWith("/_next/static/chunks/")' /tmp/mg-sw-final | wc -l)"
echo "sw_chunk_references=$SW_REFS"
echo "sw_chunk_filters=$SW_FILTERS"
test "$SW_REFS" = 1
test "$SW_FILTERS" = 1
echo "sw_chunk_manifest_entries=0"
ASSET="$(grep -oE '/_next/static/[^\" ]+\\.js' /tmp/mg-web-final | head -n 1)"
echo "sample_asset=$ASSET"
echo "sample_asset_status=$(curl -sS -o /dev/null -w '%{{http_code}}' "https://maisgestao.compumais.com$ASSET")"
pm2 jlist | node -e 'const fs=require("fs");let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{{for(const p of JSON.parse(d).filter(x=>["api-mais-gestao","web-mais-gestao"].includes(x.name))){{const file=p.pm2_env.pm_err_log_path;let text="";try{{text=fs.readFileSync(file,"utf8").split(/\\r?\\n/).slice(-200).join("\\n")}}catch{{}};const count=(text.match(/ChunkLoadError|MODULE_NOT_FOUND|ENOENT/g)||[]).length;const stat=fs.existsSync(file)?fs.statSync(file):null;console.log(`recent_log=${{p.name}},chunk_module_enoent=${{count}},modified=${{stat?stat.mtime.toISOString():"missing"}}`)}}}})'
""",
	)
finally:
	client.close()
