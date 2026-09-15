#!/usr/bin/env bash
set -euo pipefail

# No Linux o empacotamento Windows roda no GitHub Actions (windows-latest).
# Este script dispara o workflow e, se possível, baixa os artefatos.

cd "$(dirname "$0")/../.."

if ! command -v gh >/dev/null 2>&1; then
	echo "Instale o GitHub CLI (gh) para disparar o workflow."
	echo "Ou abra: GitHub → Actions → PDV instalador → Run workflow"
	echo
	echo "No Windows, para gerar neste computador: scripts\\gerar-instalador.bat local"
	exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
	echo "GitHub CLI não autenticado. Rode: gh auth login"
	exit 1
fi

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "${branch}" ]]; then
	branch="main"
fi

if ! git ls-remote --exit-code --heads origin "${branch}" >/dev/null 2>&1; then
	echo "A branch '${branch}' não existe no GitHub. Envie com: git push -u origin ${branch}"
	exit 1
fi

ahead="$(git rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo 0)"
if [[ "${ahead}" != "0" ]]; then
	echo "Aviso: há ${ahead} commit(s) local(is) não enviado(s). O instalador usará o que está no GitHub."
fi

echo "Disparando workflow 'PDV instalador' na branch ${branch}..."
gh workflow run "PDV instalador" --ref "${branch}"

echo "Aguardando o run iniciar..."
run_id=""
for _ in $(seq 1 15); do
	sleep 4
	run_id="$(gh run list --workflow "PDV instalador" --branch "${branch}" --limit 1 --json databaseId --jq '.[0].databaseId' || true)"
	if [[ -n "${run_id}" ]]; then
		break
	fi
done
if [[ -z "${run_id}" ]]; then
	echo "Não foi possível obter o run. Acompanhe em GitHub → Actions."
	exit 1
fi

echo "Acompanhando run ${run_id}..."
gh run watch "${run_id}" --exit-status

mkdir -p pdv/release
gh run download "${run_id}" --dir pdv/release
echo "Artefatos baixados em pdv/release"
