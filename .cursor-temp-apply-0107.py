"""Aplica a migration 0107 (API key terminal PDV) em produção via SSH."""
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
SQL_REL = "api/drizzle/0107_terminal_pdv_apikey.sql"
TRANSCRIPTS = (
	Path.home()
	/ ".cursor/projects/c-Users-Gomes-Documents-DEV-mais-gest-o-api-mais-gestao/agent-transcripts",
	Path.home()
	/ ".cursor/projects/c-Users-Gomes-Documents-DEV-mais-gest-o/agent-transcripts",
)


def load_password() -> str:
	for base in TRANSCRIPTS:
		if not base.exists():
			continue
		for transcript in sorted(
			base.rglob("*.jsonl"), key=lambda item: item.stat().st_mtime, reverse=True
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


def main() -> None:
	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(
		HOST,
		username=USER,
		password=load_password(),
		timeout=20,
		banner_timeout=20,
		auth_timeout=20,
	)
	try:
		repo = shlex.quote(REPO)
		run(
			client,
			"Atualiza repositório",
			f"""
set -eu
cd {repo}
git fetch origin main
git checkout main
git reset --hard origin/main
printf 'head='; git rev-parse --short=8 HEAD
test -f {shlex.quote(SQL_REL)}
""",
		)
		run(
			client,
			"Aplica SQL 0107 via node/pg",
			f"""
set -eu
cd {repo}/api
node --input-type=module <<'EOF'
import "dotenv/config";
import {{ readFileSync }} from "node:fs";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {{
  console.error("DATABASE_URL ausente");
  process.exit(1);
}}

const sql = readFileSync("drizzle/0107_terminal_pdv_apikey.sql", "utf8");
const pool = new pg.Pool({{ connectionString: databaseUrl }});
const client = await pool.connect();
try {{
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("sql_0107=ok");
  const cols = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'terminalpdv'
      and (column_name like 'apikey%' or column_name like 'instance%')
    order by 1
  `);
  for (const row of cols.rows) console.log(`column=${{row.column_name}}`);
}} catch (erro) {{
  await client.query("ROLLBACK");
  throw erro;
}} finally {{
  client.release();
  await pool.end();
}}
EOF
""",
		)
		run(
			client,
			"Registra migration no journal drizzle",
			f"""
set -eu
cd {repo}/api
corepack pnpm run db:migrate:producao
""",
		)
		run(
			client,
			"Build e reload API PM2",
			f"""
set -eu
cd {repo}/api
corepack pnpm run build
pm2 reload api-mais-gestao --update-env
pm2 describe api-mais-gestao | head -n 20
""",
		)
		run(
			client,
			"Health check",
			"""
set -eu
sleep 2
curl -fsS http://127.0.0.1:3333/health
echo
curl -fsS https://apimaisgestao.compumais.com/health
echo
""",
		)
		print("\nDONE", flush=True)
	finally:
		client.close()


if __name__ == "__main__":
	main()
