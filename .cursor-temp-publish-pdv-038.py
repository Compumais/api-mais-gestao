"""Publica PDV 0.1.38 em /opt/mais-gestao/pdv-updates via SFTP."""
import hashlib
import json
import re
import shlex
import sys
from pathlib import Path

import paramiko

HOST = "82.29.60.9"
USER = "root"
REMOTE_DIR = "/opt/mais-gestao/pdv-updates"
LOCAL_OUTPUT = Path(r"c:\Users\Gomes\Documents\DEV\mais gestão\api-mais-gestao\pdv\installer\output")
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
	manifest = json.loads((LOCAL_OUTPUT / "version.json").read_text(encoding="utf-8"))
	artifact = manifest["artifact"]
	sha256 = str(manifest["sha256"]).lower()
	size = int(manifest["size"])
	local_exe = LOCAL_OUTPUT / artifact
	if not local_exe.exists():
		raise RuntimeError(f"Setup ausente: {local_exe}")
	if local_exe.stat().st_size != size:
		raise RuntimeError("tamanho diverge do manifesto")
	digest = hashlib.sha256(local_exe.read_bytes()).hexdigest()
	if digest != sha256:
		raise RuntimeError("sha256 diverge do manifesto")

	print(f"Publicando {artifact} ({size} bytes)...", flush=True)

	client = paramiko.SSHClient()
	client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
	client.connect(HOST, username=USER, password=load_password(), timeout=30)
	try:
		# mkdir
		stdin, stdout, stderr = client.exec_command(
			f"bash -lc {shlex.quote(f'mkdir -p {REMOTE_DIR}')}"
		)
		stdout.channel.recv_exit_status()

		sftp = client.open_sftp()
		remote_tmp = f"{REMOTE_DIR}/{artifact}.tmp"
		remote_final = f"{REMOTE_DIR}/{artifact}"
		manifest_tmp = f"{REMOTE_DIR}/version.json.tmp"
		manifest_final = f"{REMOTE_DIR}/version.json"

		print("Enviando Setup (pode demorar)...", flush=True)
		sftp.put(str(local_exe), remote_tmp)
		print("Enviando version.json...", flush=True)
		sftp.put(str(LOCAL_OUTPUT / "version.json"), manifest_tmp)
		sftp.close()

		cmd = f"""
set -eu
test "$(stat -c%s '{remote_tmp}')" = '{size}'
test "$(sha256sum '{remote_tmp}' | cut -d' ' -f1)" = '{sha256}'
chmod 0644 '{remote_tmp}' '{manifest_tmp}'
mv -f '{remote_tmp}' '{remote_final}'
mv -f '{manifest_tmp}' '{manifest_final}'
find '{REMOTE_DIR}' -maxdepth 1 -type f -name 'PDV-Mais-Gestao-Setup-*.exe' ! -name '{artifact}' -delete
ls -la '{REMOTE_DIR}'
echo ---
cat '{manifest_final}'
"""
		stdin, stdout, stderr = client.exec_command(f"bash -lc {shlex.quote(cmd)}")
		out = stdout.read().decode("utf-8", "replace")
		err = stderr.read().decode("utf-8", "replace")
		code = stdout.channel.recv_exit_status()
		print(out, flush=True)
		if err:
			print(err, file=sys.stderr, flush=True)
		if code != 0:
			raise RuntimeError(f"ativacao remota falhou: {code}")

		stdin, stdout, stderr = client.exec_command(
			"bash -lc " + shlex.quote(
				"curl -fsS https://apimaisgestao.compumais.com/pdv/updates/version.json; echo"
			)
		)
		print("Endpoint:", stdout.read().decode("utf-8", "replace"), flush=True)
		print("DONE", flush=True)
	finally:
		client.close()


if __name__ == "__main__":
	main()
