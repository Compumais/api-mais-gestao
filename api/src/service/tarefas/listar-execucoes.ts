import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	listarExecucoesTarefas,
	type TarefaExecucao,
} from "@/repositories/tarefa-execucao-repositories.js";
import { httpOk, httpProibido } from "@/util/http-util.js";
import type { TipoTarefaExecucao } from "@/worker/types.js";

interface ListarExecucoesParametros {
	idusuario: string;
	idempresa?: string;
	tipo?: TipoTarefaExecucao;
	limit?: number;
}

export async function listarExecucoesTarefasService({
	idusuario,
	idempresa,
	tipo,
	limit = 20,
}: ListarExecucoesParametros): Promise<
	HttpResponse<{ execucoes: TarefaExecucao[] }>
> {
	if (idempresa) {
		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}
	}

	const execucoes = await listarExecucoesTarefas({
		limit,
		...(tipo && { tipo }),
		...(idempresa && { idempresa }),
	});

	return httpOk({ execucoes });
}
