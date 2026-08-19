import { processarEnviosDominioService } from "@/service/dominio/processar-envios-dominio.js";
import type { JobContext, JobResult } from "../types.js";

export async function executarSyncDominio(
	contexto: JobContext,
): Promise<JobResult> {
	const resultado = await processarEnviosDominioService(contexto.agora);

	return {
		processadas: resultado.enviados + resultado.consultados,
		notificacoes: resultado.armazenados,
		ignoradas: resultado.ignorados,
		detalhes: {
			enviados: resultado.enviados,
			consultados: resultado.consultados,
			armazenados: resultado.armazenados,
			erros: resultado.erros,
		},
	};
}
