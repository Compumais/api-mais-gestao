import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { TipoOrdemServicoEvento } from "@/model/tipo-ordem-servico-evento-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { contarEventosPorTipo } from "@/repositories/ordem-servico-evento-repositories.js";
import {
	atualizarTipoOrdemServicoEvento,
	buscarTipoOrdemServicoEventoPorId,
	inativarTipoOrdemServicoEvento,
	listarTiposOrdemServicoEvento,
} from "@/repositories/tipo-ordem-servico-evento-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { garantirCatalogoTiposOrdemServico } from "@/service/ordem-servico/ordem-servico-helpers.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";
import { HEX_COR_REGEX } from "@/util/ordem-servico-constants.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";

function podeGerenciar(roles: string | string[]) {
	return verificarPermissao(normalizarPerfilArray(roles), [
		"proprietario",
		"super",
	]);
}

export async function listarTiposOrdemServicoEventoService(params: {
	idempresa: string;
	idusuario: string;
	somenteAtivos?: boolean | undefined;
}): Promise<HttpResponse<TipoOrdemServicoEvento[]>> {
	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();

	await garantirCatalogoTiposOrdemServico(params.idempresa);
	const tipos = await listarTiposOrdemServicoEvento(
		params.idempresa,
		params.somenteAtivos === true,
	);
	return httpOk(tipos);
}

export async function atualizarTipoOrdemServicoEventoService(params: {
	id: string;
	idempresa: string;
	idusuario: string;
	roles: string | string[];
	dados: {
		descricao?: string | undefined;
		cor?: string | undefined;
		ordem?: number | undefined;
		ativo?: number | undefined;
	};
}): Promise<HttpResponse<TipoOrdemServicoEvento | null>> {
	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();
	if (!podeGerenciar(params.roles)) return httpProibido();

	const tipo = await buscarTipoOrdemServicoEventoPorId(
		params.id,
		params.idempresa,
	);
	if (!tipo) return httpNaoEncontrado();

	if (params.dados.cor && !HEX_COR_REGEX.test(params.dados.cor)) {
		return httpBadRequest("Cor inválida. Use o formato #RRGGBB");
	}

	const atualizado = await atualizarTipoOrdemServicoEvento(
		params.id,
		params.idempresa,
		params.dados,
	);

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "atualizar_tipo_ordem_servico_evento",
		idusuario: params.idusuario,
		recurso: "tipo_ordem_servico_evento",
		idrecurso: params.id,
		idempresa: params.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {
			codigo: tipo.codigo,
			camposAlterados: Object.keys(params.dados),
		},
	});

	return httpOk(atualizado);
}

export async function excluirTipoOrdemServicoEventoService(params: {
	id: string;
	idempresa: string;
	idusuario: string;
	roles: string | string[];
}): Promise<HttpResponse<null>> {
	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return httpProibido();
	if (!podeGerenciar(params.roles)) return httpProibido();

	const tipo = await buscarTipoOrdemServicoEventoPorId(
		params.id,
		params.idempresa,
	);
	if (!tipo) return httpNaoEncontrado();

	const usos = await contarEventosPorTipo(params.id, params.idempresa);
	if (usos > 0 || tipo.padrao === 1) {
		await inativarTipoOrdemServicoEvento(params.id, params.idempresa);
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "inativar_tipo_ordem_servico_evento",
			idusuario: params.idusuario,
			recurso: "tipo_ordem_servico_evento",
			idrecurso: params.id,
			idempresa: params.idempresa,
			criadoem: new Date().toISOString(),
			metadados: { codigo: tipo.codigo, usos },
		});
		return httpSemConteudo();
	}

	await inativarTipoOrdemServicoEvento(params.id, params.idempresa);
	return httpSemConteudo();
}
