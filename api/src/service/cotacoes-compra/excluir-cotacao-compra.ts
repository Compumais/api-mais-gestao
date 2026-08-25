import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCotacaoCompraPorId,
	excluirCotacaoCompra,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

export async function excluirCotacaoCompraService({
	id,
	idusuario,
}: {
	id: string;
	idusuario: string;
}): Promise<HttpResponse<void>> {
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
		return httpBadRequest("Somente cotações em rascunho podem ser excluídas");
	}

	const excluida = await excluirCotacaoCompra(id);
	if (!excluida) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
