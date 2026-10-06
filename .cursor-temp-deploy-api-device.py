"""Deploy só da API (bypass pdv-device) via SSH."""
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


def run(client, label, command):
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


def main():
	# precisa push primeiro — este script só aplica o que já estiver no remoto
	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(HOST, username=USER, password=load_password(), timeout=20)
	repo = shlex.quote(REPO)
	try:
		run(
			client,
			"Pull + build + reload",
			f"""
set -eu
cd {repo}
git fetch origin main
git checkout main
git reset --hard origin/main
printf 'head='; git rev-parse --short=8 HEAD
cd {repo}/api
corepack pnpm run build
pm2 reload api-mais-gestao --update-env
sleep 3
curl -fsS https://apimaisgestao.compumais.com/health
echo
""",
		)
		print("DONE", flush=True)
	finally:
		client.close()


if __name__ == "__main__":
	main()
