import { conciliarNfcePendentes } from "@/service/nfce-emissao/conciliar-nfce-pendentes.js";
import type { JobContext, JobResult } from "@/worker/types.js";

export async function executarConciliacaoNfcePendentes(
	_contexto: JobContext,
): Promise<JobResult> {
	const resumo = await conciliarNfcePendentes({
		motivo: "rotina_periodica",
		limite: 15,
	});

	return {
		processadas: resumo.analisadas,
		notificacoes: 0,
		ignoradas: resumo.ignoradas,
		detalhes: {
			recuperadas: resumo.recuperadas,
			conflitos: resumo.conflitos,
			aguardando: resumo.aguardando,
		},
	};
}
