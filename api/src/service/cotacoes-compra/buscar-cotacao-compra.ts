import type { CotacaoCompraCompleta } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCotacaoCompraPorId,
	contarPropostasCotacao,
	listarItensCotacaoCompraEnriquecidos,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export async function buscarCotacaoCompraPorIdService({
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
