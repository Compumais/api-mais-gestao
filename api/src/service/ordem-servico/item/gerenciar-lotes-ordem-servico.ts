import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { OrdemServicoItemLote } from "@/model/ordem-servico-item-lote-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarOrdemServicoItemLote,
	buscarOrdemServicoItemLotePorId,
	criarOrdemServicoItemLote,
	excluirOrdemServicoItemLote,
	listarLotesPorItem,
} from "@/repositories/ordem-servico-item-lote-repositories.js";
import { buscarOrdemServicoItemPorId } from "@/repositories/ordem-servico-item-repositories.js";
import { buscarOrdemServicoPorIdEempresa } from "@/repositories/ordem-servico-repositories.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

async function validarContexto(params: {
	ordemServicoId: string;
	itemId: string;
	idempresa: string;
	idusuario: string;
}) {
	const os = await buscarOrdemServicoPorIdEempresa(
		params.ordemServicoId,
		params.idempresa,
	);
	if (!os) return { erro: httpNaoEncontrado() as HttpResponse<null> };

	const ok = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!ok) return { erro: httpProibido() as HttpResponse<null> };

	const item = await buscarOrdemServicoItemPorId(
		params.itemId,
		params.idempresa,
	);
	if (!item || item.idordemservico !== params.ordemServicoId) {
		return { erro: httpNaoEncontrado() as HttpResponse<null> };
	}

	return { item };
}

export async function listarLotesItemOrdemServicoService(params: {
	ordemServicoId: string;
	itemId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<OrdemServicoItemLote[]>> {
	const contexto = await validarContexto(params);
	if ("erro" in contexto && contexto.erro) {
		return contexto.erro as HttpResponse<OrdemServicoItemLote[]>;
	}
	const lotes = await listarLotesPorItem(params.itemId, params.idempresa);
	return httpOk(lotes);
}

export async function criarLoteItemOrdemServicoService(params: {
	ordemServicoId: string;
	itemId: string;
	idempresa: string;
	idusuario: string;
	dados: {
		codigolote?: string | undefined;
		quantidade: string;
		vencimento?: string | undefined;
		datalote?: string | undefined;
		emissao?: string | undefined;
		idlote?: string | undefined;
	};
}): Promise<HttpResponse<OrdemServicoItemLote | null>> {
	const contexto = await validarContexto(params);
	if ("erro" in contexto && contexto.erro) {
		return contexto.erro as HttpResponse<OrdemServicoItemLote | null>;
	}

	if (!(Number(params.dados.quantidade) > 0)) {
		return httpBadRequest("Quantidade do lote inválida");
	}

	const agora = new Date().toISOString();
	const lote = await criarOrdemServicoItemLote({
		id: uuidv4(),
		idempresa: params.idempresa,
		idordemservicoitem: params.itemId,
		codigolote: params.dados.codigolote ?? null,
		quantidade: params.dados.quantidade,
		vencimento: params.dados.vencimento ?? null,
		datalote: params.dados.datalote ?? null,
		emissao: params.dados.emissao ?? null,
		idlote: params.dados.idlote ?? null,
		datacriacao: agora,
		dataalteracao: agora,
	});

	if (!lote) return httpBadRequest("Falha ao criar lote");
	return httpCriacao(lote);
}

export async function atualizarLoteItemOrdemServicoService(params: {
	ordemServicoId: string;
	itemId: string;
	loteId: string;
	idempresa: string;
	idusuario: string;
	dados: Partial<{
		codigolote: string | null;
		quantidade: string;
		vencimento: string | null;
		datalote: string | null;
		emissao: string | null;
		idlote: string | null;
	}>;
}): Promise<HttpResponse<OrdemServicoItemLote | null>> {
	const contexto = await validarContexto(params);
	if ("erro" in contexto && contexto.erro) {
		return contexto.erro as HttpResponse<OrdemServicoItemLote | null>;
	}

	const lote = await buscarOrdemServicoItemLotePorId(
		params.loteId,
		params.idempresa,
	);
	if (!lote || lote.idordemservicoitem !== params.itemId) {
		return httpNaoEncontrado();
	}

	const atualizado = await atualizarOrdemServicoItemLote(
		params.loteId,
		params.idempresa,
		params.dados,
	);
	if (!atualizado) return httpNaoEncontrado();
	return httpOk(atualizado);
}

export async function excluirLoteItemOrdemServicoService(params: {
	ordemServicoId: string;
	itemId: string;
	loteId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<null>> {
	const contexto = await validarContexto(params);
	if ("erro" in contexto && contexto.erro) {
		return contexto.erro as HttpResponse<null>;
	}

	const lote = await buscarOrdemServicoItemLotePorId(
		params.loteId,
		params.idempresa,
	);
	if (!lote || lote.idordemservicoitem !== params.itemId) {
		return httpNaoEncontrado();
	}

	await excluirOrdemServicoItemLote(params.loteId, params.idempresa);
	return httpSemConteudo();
}
