#!/usr/bin/env bash
set -euo pipefail

# No Linux o empacotamento Windows roda no GitHub Actions (windows-latest).
# Este script dispara o workflow e, se possível, baixa os artefatos.

cd "$(dirname "$0")/../.."

if ! command -v gh >/dev/null 2>&1; then
	echo "Instale o GitHub CLI (gh) para disparar o workflow."
	echo "Ou abra: GitHub → Actions → PDV instalador → Run workflow"
	exit 1
fi

echo "Disparando workflow 'PDV instalador'..."
gh workflow run "PDV instalador" --ref "$(git branch --show-current)"

echo "Aguardando o run iniciar..."
sleep 4
run_id="$(gh run list --workflow "PDV instalador" --limit 1 --json databaseId --jq '.[0].databaseId')"
if [[ -z "${run_id}" ]]; then
	echo "Não foi possível obter o run. Acompanhe em GitHub → Actions."
	exit 1
fi

echo "Acompanhando run ${run_id}..."
gh run watch "${run_id}"

mkdir -p pdv/release
gh run download "${run_id}" --dir pdv/release
echo "Artefatos baixados em pdv/release"
