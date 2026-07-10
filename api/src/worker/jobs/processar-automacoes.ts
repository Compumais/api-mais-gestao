import { listarAutomacoesVencidas } from "@/repositories/automacao-repositories.js";
import { executarAutomacaoAgora } from "@/service/automacao/executar-automacao.js";
import type { JobContext, JobResult } from "../types.js";

export async function executarProcessarAutomacoes(
	contexto: JobContext,
): Promise<JobResult> {
	const vencidas = await listarAutomacoesVencidas(contexto.agora.toISOString());

	let processadas = 0;
	let notificacoes = 0;
	let ignoradas = 0;
	const detalhes: Array<Record<string, unknown>> = [];

	for (const automacao of vencidas) {
		try {
			const resultado = await executarAutomacaoAgora(
				automacao,
				contexto.agora,
			);
			processadas += 1;
			if (
				resultado.status === "aguardando_correcao" ||
				resultado.status === "sucesso"
			) {
				notificacoes += 1;
			}
			detalhes.push({
				id: automacao.id,
				status: resultado.status,
				mensagem: resultado.mensagem,
			});
		} catch (erro) {
			ignoradas += 1;
			detalhes.push({
				id: automacao.id,
				erro: erro instanceof Error ? erro.message : "erro",
			});
		}
	}

	return {
		processadas,
		notificacoes,
		ignoradas,
		detalhes: { itens: detalhes },
	};
}
