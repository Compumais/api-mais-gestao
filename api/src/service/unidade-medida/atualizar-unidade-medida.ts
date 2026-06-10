import { v4 as uuidv4 } from "uuid";
import type {
	UnidadeMedida,
	NovoUnidadeMedida,
} from "@/model/unidade-medida-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarUnidadeMedidaPorId,
	atualizarUnidadeMedida,
} from "@/repositories/unidade-medida-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarUnidadeMedidaParametros = {
	unidadeMedidaId: string;
	idusuario: string;
	dados: Partial<NovoUnidadeMedida>;
};

export async function atualizarUnidadeMedidaService({
	unidadeMedidaId,
	idusuario,
	dados,
}: AtualizarUnidadeMedidaParametros): Promise<
	HttpResponse<UnidadeMedida | null>
> {
	const registroExistente = await buscarUnidadeMedidaPorId(unidadeMedidaId);

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

	const registroAtualizado = await atualizarUnidadeMedida(
		unidadeMedidaId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	const auditoriaId = uuidv4();

	await criarAuditoriaService({
		id: auditoriaId,
		acao: "atualizar_unidade_medida",
		idusuario,
		recurso: "unidade_medida",
		idrecurso: unidadeMedidaId,
		idempresa: registroExistente.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dados),
			valores: dados,
		},
	});

	return httpOk<UnidadeMedida>(registroAtualizado);
}
