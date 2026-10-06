"""Mostra de onde a API serve updates do PDV e o conteudo do version.json."""
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
	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(HOST, username=USER, password=load_password(), timeout=20)
	repo = shlex.quote(REPO)
	try:
		run(
			client,
			"Env e pastas de update",
			f"""
set -eu
cd {repo}/api
node --input-type=module <<'EOF'
import "dotenv/config";
console.log("PDV_UPDATES_PATH=" + (process.env.PDV_UPDATES_PATH || "(unset)"));
EOF
echo ---
ls -la /opt/mais-gestao/pdv-updates 2>/dev/null || echo "opt_pdv_updates=absent"
echo ---
ls -la {repo}/pdv/installer/output 2>/dev/null || echo "installer_output=absent"
echo ---
for f in /opt/mais-gestao/pdv-updates/version.json {repo}/pdv/installer/output/version.json; do
  if [ -f "$f" ]; then
    echo "FILE=$f"
    cat "$f"
    echo
  fi
done
""",
		)
		run(
			client,
			"Endpoint publico",
			"""
set -eu
curl -fsS --max-time 15 https://apimaisgestao.compumais.com/pdv/updates/version.json
echo
""",
		)
		print("\nDONE", flush=True)
	finally:
		client.close()


if __name__ == "__main__":
	main()
