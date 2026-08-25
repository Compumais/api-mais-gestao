import { v4 as uuidv4 } from "uuid";
import type { CotacaoCompraCompleta } from "@/model/cotacao-compra-model.js";
import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarCotacaoCompra,
	buscarCotacaoCompraPorId,
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

export async function abrirCotacaoCompraService({
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

	if (cotacao.status === STATUS_COTACAO_COMPRA.ABERTA) {
		const [itens, totalpropostas] = await Promise.all([
			listarItensCotacaoCompraEnriquecidos(id),
			contarPropostasCotacao(id),
		]);
		return httpOk<CotacaoCompraCompleta>({
			...cotacao,
			itens,
			totalpropostas,
		});
	}

	if (cotacao.status !== STATUS_COTACAO_COMPRA.RASCUNHO) {
		return httpBadRequest("Somente cotações em rascunho podem ser abertas");
	}

	const itens = await listarItensCotacaoCompraEnriquecidos(id);
	if (itens.length === 0) {
		return httpBadRequest("Inclua ao menos um produto antes de abrir a cotação");
	}

	const tokenpublico = cotacao.tokenpublico ?? uuidv4();
	const atualizada = await atualizarCotacaoCompra(id, {
		status: STATUS_COTACAO_COMPRA.ABERTA,
		tokenpublico,
		currenttimemillis: Date.now(),
	});

	if (!atualizada) {
		return httpNaoEncontrado();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "abrir_cotacao_compra",
		idusuario,
		recurso: "cotacao_compra",
		idrecurso: id,
		idempresa: cotacao.idempresa,
		criadoem: new Date().toISOString(),
		metadados: { tokenpublico },
	});

	return httpOk<CotacaoCompraCompleta>({
		...atualizada,
		itens,
		totalpropostas: 0,
	});
}
