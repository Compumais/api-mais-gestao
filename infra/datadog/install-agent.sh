#!/usr/bin/env bash
# Instala o Datadog Agent 7 no host (Ubuntu/Debian).
# Uso na VPS:
#   export DD_API_KEY="<sua-key>"
#   bash infra/datadog/install-agent.sh
#
# Ou em uma linha:
#   DD_API_KEY="..." DD_SITE="us5.datadoghq.com" DD_ENV="prod" bash infra/datadog/install-agent.sh

set -euo pipefail

if [[ -z "${DD_API_KEY:-}" ]]; then
	echo "Erro: defina DD_API_KEY antes de executar." >&2
	echo "  export DD_API_KEY=\"<sua-key>\"" >&2
	exit 1
fi

export DD_SITE="${DD_SITE:-us5.datadoghq.com}"
export DD_ENV="${DD_ENV:-prod}"

echo "Instalando Datadog Agent (site=${DD_SITE}, env=${DD_ENV})..."
bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"

echo ""
echo "Próximos passos:"
echo "  1. Copie infra/datadog/conf.d/* para /etc/datadog-agent/conf.d/"
echo "  2. Mesclar infra/datadog/datadog.yaml.snippet em /etc/datadog-agent/datadog.yaml"
echo "  3. sudo usermod -aG docker dd-agent && sudo systemctl restart datadog-agent"
echo "  4. sudo datadog-agent status"
