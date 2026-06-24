import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoUnidadeMedida,
	UnidadeMedida,
} from "@/model/unidade-medida-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarUnidadeMedida,
	buscarUnidadeMedidaPorId,
} from "@/repositories/unidade-medida-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { isUnidadeMedidaGlobal } from "@/service/unidade-medida/validar-unidade-medida-empresa.js";
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

	if (isUnidadeMedidaGlobal(registroExistente)) {
		return httpProibido();
	}

	if (!registroExistente.idempresa) {
		return httpProibido();
	}

	const idempresa = registroExistente.idempresa;

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { idempresa: _idempresa, ...dadosAtualizacao } = dados;

	const registroAtualizado = await atualizarUnidadeMedida(
		unidadeMedidaId,
		dadosAtualizacao,
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
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			camposAlterados: Object.keys(dadosAtualizacao),
			valores: dadosAtualizacao,
		},
	});

	return httpOk<UnidadeMedida>(registroAtualizado);
}
