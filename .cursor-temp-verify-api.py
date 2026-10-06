"""Verifica health da API após reload."""
import re
import shlex
import sys
from pathlib import Path

import paramiko

HOST = "82.29.60.9"
USER = "root"
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


def main() -> None:
	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(HOST, username=USER, password=load_password(), timeout=20)
	cmd = r"""
set -eu
sleep 3
pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const apps=JSON.parse(d);const a=apps.find(x=>x.name==="api-mais-gestao"); if(!a){console.log("api=missing"); process.exit(1);} console.log("status="+a.pm2_env.status); console.log("restarts="+a.pm2_env.restart_time); console.log("uptime_ms="+(Date.now()-a.pm2_env.pm_uptime));})'
echo ---
curl -fsS --max-time 15 https://apimaisgestao.compumais.com/health; echo
echo ---
tail -n 40 /root/.pm2/logs/api-mais-gestao-error.log || true
"""
	stdin, stdout, stderr = client.exec_command(f"bash -lc {shlex.quote(cmd)}")
	stdin.close()
	sys.stdout.write(stdout.read().decode("utf-8", "replace"))
	sys.stderr.write(stderr.read().decode("utf-8", "replace"))
	code = stdout.channel.recv_exit_status()
	client.close()
	raise SystemExit(code)


if __name__ == "__main__":
	main()
