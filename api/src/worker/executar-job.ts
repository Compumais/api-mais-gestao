import {
	finalizarExecucao,
	registrarInicioExecucao,
} from "@/repositories/tarefa-execucao-repositories.js";
import type { JobHandler, JobResult, TipoTarefaExecucao } from "./types.js";

const TIMEOUT_JOB_MS = 120_000;

export async function executarJob(
	tipo: TipoTarefaExecucao,
	handler: JobHandler,
	contexto: { agora: Date },
	idempresa?: string | null,
): Promise<JobResult> {
	const idExecucao = await registrarInicioExecucao({
		tipo,
		...(idempresa !== undefined && { idempresa }),
	});

	try {
		const resultado = await Promise.race([
			handler(contexto),
			new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error(`Timeout do job ${tipo} após ${TIMEOUT_JOB_MS}ms`)),
					TIMEOUT_JOB_MS,
				);
			}),
		]);

		const status =
			resultado.processadas === 0 &&
			resultado.notificacoes === 0 &&
			resultado.ignoradas > 0
				? "ignorado"
				: "sucesso";

		await finalizarExecucao({
			id: idExecucao,
			status,
			detalhes: resultado,
		});

		return resultado;
	} catch (error) {
		const mensagem =
			error instanceof Error ? error.message : "Erro desconhecido no job";

		await finalizarExecucao({
			id: idExecucao,
			status: "erro",
			erro: mensagem,
		});

		throw error;
	}
}
