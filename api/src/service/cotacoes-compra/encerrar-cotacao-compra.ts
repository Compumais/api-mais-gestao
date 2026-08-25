import { v4 as uuidv4 } from "uuid";
import type { CotacaoCompra, CotacaoCompraCompleta } from "@/model/cotacao-compra-model.js";
import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCotacaoCompra,
	buscarCotacaoCompraPorId,
	contarPedidosPorCotacao,
	contarPropostasCotacao,
	listarItensCotacaoCompraEnriquecidos,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

async function montarCotacaoCompleta(
	cotacao: CotacaoCompra,
): Promise<CotacaoCompraCompleta> {
	const [itens, totalpropostas] = await Promise.all([
		listarItensCotacaoCompraEnriquecidos(cotacao.id),
		contarPropostasCotacao(cotacao.id),
	]);
	return { ...cotacao, itens, totalpropostas };
}

export async function encerrarCotacaoCompraService({
	id,
	idusuario,
}: {
	id: string;
	idusuario: string;
}): Promise<HttpResponse<CotacaoCompraCompleta>> {
	const cotacao = await buscarCotacaoCompraPorId(id);
	if (!cotacao) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		cotacao.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (cotacao.status !== STATUS_COTACAO_COMPRA.ABERTA) {
		return httpBadRequest("Somente cotações abertas podem ser encerradas");
	}

	const atualizada = await atualizarCotacaoCompra(id, {
		status: STATUS_COTACAO_COMPRA.ENCERRADA,
		currenttimemillis: Date.now(),
	});
	if (!atualizada) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "encerrar_cotacao_compra",
		idusuario,
		recurso: "cotacao_compra",
		idrecurso: id,
		idempresa: cotacao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {},
	});

	return httpOk(await montarCotacaoCompleta(atualizada));
}

export async function cancelarCotacaoCompraService({
	id,
	idusuario,
}: {
	id: string;
	idusuario: string;
}): Promise<HttpResponse<CotacaoCompraCompleta>> {
	const cotacao = await buscarCotacaoCompraPorId(id);
	if (!cotacao) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		cotacao.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (
		cotacao.status !== STATUS_COTACAO_COMPRA.RASCUNHO &&
		cotacao.status !== STATUS_COTACAO_COMPRA.ABERTA
	) {
		return httpBadRequest("Esta cotação não pode ser cancelada");
	}

	const pedidos = await contarPedidosPorCotacao(id);
	if (pedidos > 0) {
		return httpBadRequest(
			"Não é possível cancelar uma cotação que já gerou pedidos de compra",
		);
	}

	const atualizada = await atualizarCotacaoCompra(id, {
		status: STATUS_COTACAO_COMPRA.CANCELADA,
		currenttimemillis: Date.now(),
	});
	if (!atualizada) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "cancelar_cotacao_compra",
		idusuario,
		recurso: "cotacao_compra",
		idrecurso: id,
		idempresa: cotacao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: {},
	});

	return httpOk(await montarCotacaoCompleta(atualizada));
}
