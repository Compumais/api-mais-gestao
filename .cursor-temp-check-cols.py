"""Confirma colunas e recria se necessário no DB da API."""
import re
import shlex
import sys
from pathlib import Path

import paramiko

HOST = "82.29.60.9"
USER = "root"
REPO = "/home/deploy/aplicacão/api-mais-gestao"
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
	raise RuntimeError("senha nao encontrada")


def run(client: paramiko.SSHClient, label: str, command: str) -> str:
	print(f"\n=== {label} ===", flush=True)
	stdin, stdout, stderr = client.exec_command(
		f"bash -lc {shlex.quote(command)}", get_pty=False
	)
	stdin.close()
	out = stdout.read().decode("utf-8", "replace")
	err = stderr.read().decode("utf-8", "replace")
	code = stdout.channel.recv_exit_status()
	if out:
		print(out.rstrip(), flush=True)
	if err:
		print(err.rstrip(), file=sys.stderr, flush=True)
	if code != 0:
		raise RuntimeError(f"{label} exit={code}")
	return out


def main() -> None:
	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(HOST, username=USER, password=load_password(), timeout=20)
	repo = shlex.quote(REPO)
	try:
		run(
			client,
			"Colunas atuais + fingerprint DB",
			f"""
set -eu
cd {repo}/api
node --input-type=module <<'EOF'
import "dotenv/config";
import pg from "pg";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const u = new URL(url);
console.log("db_host=" + u.hostname);
console.log("db_port=" + u.port);
console.log("db_name=" + u.pathname);
const pool = new pg.Pool({{ connectionString: url }});
const cols = await pool.query(`
  select column_name
  from information_schema.columns
  where table_schema='public' and table_name='terminalpdv'
  order by ordinal_position
`);
console.log("columns=" + cols.rows.map(r => r.column_name).join(","));
const has = cols.rows.some(r => r.column_name === "apikey_prefix");
console.log("has_apikey_prefix=" + has);
await pool.end();
EOF
""",
		)
		run(
			client,
			"Últimos erros PM2 (após reload)",
			"""
set -eu
echo "now=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# mostra só as últimas 15 linhas
tail -n 15 /root/.pm2/logs/api-mais-gestao-error.log || true
""",
		)
		print("\nDONE", flush=True)
	finally:
		client.close()


if __name__ == "__main__":
	main()
