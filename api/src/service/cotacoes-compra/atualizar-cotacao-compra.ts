import type { CotacaoCompraCompleta } from "@/model/cotacao-compra-model.js";
import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCotacaoCompra,
	buscarCotacaoCompraPorId,
	listarItensCotacaoCompraEnriquecidos,
	substituirItensCotacaoCompra,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	type ItemCotacaoCompraInput,
	validarItensCotacao,
} from "./criar-cotacao-compra.js";

type AtualizarCotacaoCompraParametros = {
	id: string;
	idusuario: string;
	dados: {
		titulo?: string;
		observacao?: string | null;
		validade?: string | null;
		itens?: ItemCotacaoCompraInput[];
	};
};

export async function atualizarCotacaoCompraService({
	id,
	idusuario,
	dados,
}: AtualizarCotacaoCompraParametros): Promise<
	HttpResponse<CotacaoCompraCompleta>
> {
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

	if (cotacao.status !== STATUS_COTACAO_COMPRA.RASCUNHO) {
		return httpBadRequest("Somente cotações em rascunho podem ser editadas");
	}

	if (dados.itens) {
		const itensValidados = await validarItensCotacao(
			cotacao.idempresa,
			dados.itens,
		);
		if (!("itens" in itensValidados) || !itensValidados.success) {
			return itensValidados as HttpResponse<CotacaoCompraCompleta>;
		}

		await substituirItensCotacaoCompra(
			id,
			itensValidados.itens.map((item) => ({ ...item, idcotacao: id })),
		);
	}

	const atualizada = await atualizarCotacaoCompra(id, {
		titulo: dados.titulo?.trim() ?? cotacao.titulo,
		observacao: dados.observacao !== undefined ? dados.observacao : cotacao.observacao,
		validade: dados.validade !== undefined ? dados.validade : cotacao.validade,
		currenttimemillis: Date.now(),
	});

	if (!atualizada) {
		return httpNaoEncontrado();
	}

	const itens = await listarItensCotacaoCompraEnriquecidos(id);

	return httpOk<CotacaoCompraCompleta>({
		...atualizada,
		itens,
		totalpropostas: 0,
	});
}
