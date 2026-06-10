import { v4 as uuidv4 } from "uuid";
import type {
	TipoProblema,
	NovoTipoProblema,
} from "@/model/tipo-problema-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarTipoProblemaPorId,
	atualizarTipoProblema,
} from "@/repositories/tipo-problema-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarTipoProblemaParametros = {
	tipoProblemaId: string;
	idusuario: string;
	dados: Partial<NovoTipoProblema>;
};

export async function atualizarTipoProblemaService({
	tipoProblemaId,
	idusuario,
	dados,
}: AtualizarTipoProblemaParametros): Promise<
	HttpResponse<TipoProblema | null>
> {
	const registroExistente = await buscarTipoProblemaPorId(tipoProblemaId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroAtualizado = await atualizarTipoProblema(tipoProblemaId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_tipo_problema",
		idusuario,
		recurso: "tipo_problema",
		idrecurso: tipoProblemaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<TipoProblema>(registroAtualizado);
}
