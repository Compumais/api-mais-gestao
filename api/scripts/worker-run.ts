import {
	JOBS_DISPONIVEIS,
	type NomeJobManual,
} from "@/worker/agendador.js";

const nomeJob = process.argv[2] as NomeJobManual | undefined;

if (!nomeJob || !(nomeJob in JOBS_DISPONIVEIS)) {
	console.error(
		"Uso: npm run worker:run -- <job>\nJobs: alertasVencimento, saldoBaixo, conciliacaoPendente, relatoriosAutomaticos, verificarCiclosPlano",
	);
	process.exit(1);
}

async function main() {
	console.log(`[worker:run] Executando job: ${nomeJob}`);
	const resultado = await JOBS_DISPONIVEIS[nomeJob]();
	console.log("[worker:run] Resultado:", resultado);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("[worker:run] Erro:", error);
		process.exit(1);
	});
