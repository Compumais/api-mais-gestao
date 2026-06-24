import { verificarCiclosService } from "@/service/planos/verificar-ciclo.js";
import type { JobContext, JobResult } from "@/worker/types.js";

export async function executarVerificarCiclosPlano(
	_contexto: JobContext,
): Promise<JobResult> {
	const resultado = await verificarCiclosService();

	return {
		processadas: resultado.planosExpirados,
		notificacoes: 0,
		ignoradas: 0,
		detalhes: resultado,
	};
}
