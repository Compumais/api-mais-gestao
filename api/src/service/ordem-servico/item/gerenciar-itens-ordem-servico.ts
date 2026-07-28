import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	NovoOrdemServicoItem,
	OrdemServicoItem,
} from "@/model/ordem-servico-item-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarOrdemServicoItem,
	buscarOrdemServicoItemPorId,
	contarItensOrdemServico,
	criarOrdemServicoItem,
	excluirOrdemServicoItem,
	listarItensPorOrdemServico,
} from "@/repositories/ordem-servico-item-repositories.js";
import {
	buscarOrdemServicoPorIdEempresa,
	recalcularTotaisOrdemServico,
} from "@/repositories/ordem-servico-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	calcularTotalItem,
	garantirConfiguracaoOrdemServico,
} from "@/service/ordem-servico/ordem-servico-helpers.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

async function validarAcessoOs(
	ordemServicoId: string,
	idempresa: string,
	idusuario: string,
) {
	const os = await buscarOrdemServicoPorIdEempresa(ordemServicoId, idempresa);
	if (!os) return { erro: httpNaoEncontrado() as HttpResponse<null> };
	const ok = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!ok) return { erro: httpProibido() as HttpResponse<null> };
	return { os };
}

export async function listarItensOrdemServicoService(params: {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<OrdemServicoItem[]>> {
	const acesso = await validarAcessoOs(
		params.ordemServicoId,
		params.idempresa,
		params.idusuario,
	);
	if ("erro" in acesso && acesso.erro) {
		return acesso.erro as HttpResponse<OrdemServicoItem[]>;
	}

	const itens = await listarItensPorOrdemServico(
		params.ordemServicoId,
		params.idempresa,
	);
	return httpOk(itens);
}

export async function criarItemOrdemServicoService(params: {
	ordemServicoId: string;
	idempresa: string;
	idusuario: string;
	dados: {
		idproduto: string;
		quantidade: string;
		preco: string;
		idtecnico?: string | undefined;
		idcfop?: string | undefined;
		unidademedida?: string | undefined;
		observacao?: string | undefined;
	};
}): Promise<HttpResponse<OrdemServicoItem | null>> {
	const acesso = await validarAcessoOs(
		params.ordemServicoId,
		params.idempresa,
		params.idusuario,
	);
	if ("erro" in acesso && acesso.erro) {
		return acesso.erro as HttpResponse<OrdemServicoItem | null>;
	}

	const produto = await buscarProdutoPorId(params.dados.idproduto);
	if (!produto || produto.idempresa !== params.idempresa) {
		return httpBadRequest("Produto não encontrado na empresa");
	}

	const config = await garantirConfiguracaoOrdemServico(params.idempresa);
	if (config.tecnicoobrigatorio === 1 && !params.dados.idtecnico) {
		return httpBadRequest("Técnico obrigatório para itens da ordem de serviço");
	}

	const quantidade = Number(params.dados.quantidade);
	const preco = Number(params.dados.preco);
	if (!(quantidade > 0) || !(preco >= 0)) {
		return httpBadRequest("Quantidade e preço inválidos");
	}

	const contador =
		(await contarItensOrdemServico(params.ordemServicoId, params.idempresa)) +
		1;
	const agora = new Date().toISOString();
	const total = calcularTotalItem(params.dados.quantidade, params.dados.preco);

	const item = await criarOrdemServicoItem({
		id: uuidv4(),
		idempresa: params.idempresa,
		idordemservico: params.ordemServicoId,
		idproduto: produto.id,
		nomeproduto: produto.descricao,
		codigorproduto: produto.codigo != null ? String(produto.codigo) : null,
		quantidade: params.dados.quantidade,
		preco: params.dados.preco,
		precoinformado: params.dados.preco,
		precooriginal: params.dados.preco,
		total,
		idtecnico: params.dados.idtecnico ?? null,
		idcfop: params.dados.idcfop ?? null,
		unidademedida: params.dados.unidademedida ?? null,
		observacao: params.dados.observacao ?? null,
		contador,
		cancelado: 0,
		datainclusao: agora,
		datahora: agora,
		datacriacao: agora,
		dataalteracao: agora,
	} satisfies NovoOrdemServicoItem);

	if (!item) return httpBadRequest("Falha ao criar item");

	await recalcularTotaisOrdemServico(params.ordemServicoId, params.idempresa);
	return httpCriacao(item);
}

export async function atualizarItemOrdemServicoService(params: {
	ordemServicoId: string;
	itemId: string;
	idempresa: string;
	idusuario: string;
	dados: Partial<{
		quantidade: string;
		preco: string;
		idtecnico: string | null;
		idcfop: string | null;
		unidademedida: string | null;
		observacao: string | null;
		cancelado: number;
	}>;
}): Promise<HttpResponse<OrdemServicoItem | null>> {
	const acesso = await validarAcessoOs(
		params.ordemServicoId,
		params.idempresa,
		params.idusuario,
	);
	if ("erro" in acesso && acesso.erro) {
		return acesso.erro as HttpResponse<OrdemServicoItem | null>;
	}

	const item = await buscarOrdemServicoItemPorId(
		params.itemId,
		params.idempresa,
	);
	if (!item || item.idordemservico !== params.ordemServicoId) {
		return httpNaoEncontrado();
	}

	const quantidade = params.dados.quantidade ?? item.quantidade ?? "0";
	const preco = params.dados.preco ?? item.preco ?? "0";
	const total = calcularTotalItem(quantidade, preco);

	const atualizado = await atualizarOrdemServicoItem(
		params.itemId,
		params.idempresa,
		{
			...params.dados,
			quantidade,
			preco,
			total,
		},
	);

	if (!atualizado) return httpNaoEncontrado();
	await recalcularTotaisOrdemServico(params.ordemServicoId, params.idempresa);
	return httpOk(atualizado);
}

export async function excluirItemOrdemServicoService(params: {
	ordemServicoId: string;
	itemId: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<null>> {
	const acesso = await validarAcessoOs(
		params.ordemServicoId,
		params.idempresa,
		params.idusuario,
	);
	if ("erro" in acesso && acesso.erro) {
		return acesso.erro as HttpResponse<null>;
	}

	const item = await buscarOrdemServicoItemPorId(
		params.itemId,
		params.idempresa,
	);
	if (!item || item.idordemservico !== params.ordemServicoId) {
		return httpNaoEncontrado();
	}

	await excluirOrdemServicoItem(params.itemId, params.idempresa);
	await recalcularTotaisOrdemServico(params.ordemServicoId, params.idempresa);
	return httpSemConteudo();
}
