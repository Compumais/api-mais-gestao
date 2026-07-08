/**
 * Exemplo de ecosystem PM2 para produção.
 * Copie para /opt/mais-gestao/web/ecosystem.config.cjs e use:
 *
 *   pm2 start /opt/mais-gestao/web/ecosystem.config.cjs
 *   pm2 save
 *
 * Os nomes dos arquivos de log devem bater com infra/datadog/conf.d/pm2.d/conf.yaml.
 */
module.exports = {
	apps: [
		{
			name: "mais-gestao-web",
			cwd: "/opt/mais-gestao/web",
			script: "pnpm",
			args: "start -- -p 3000",
			interpreter: "none",
			env: {
				NODE_ENV: "production",
			},
			// PM2 grava em ~/.pm2/logs/ por padrão — Datadog faz tail desses arquivos.
			out_file: "/home/deploy/.pm2/logs/mais-gestao-web-out.log",
			error_file: "/home/deploy/.pm2/logs/mais-gestao-web-error.log",
			merge_logs: false,
			autorestart: true,
			max_restarts: 10,
			watch: false,
		},
	],
};
