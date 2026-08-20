import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	type ResultadoFefo,
	resolverLotesFefo,
} from "@/service/lote/resolver-lotes-fefo.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export async function sugerirLotesFefoService(params: {
	idusuario: string;
	idempresa: string;
	idproduto: string;
	quantidade: number;
	idcfop?: string | null | undefined;
	dataReferencia?: string | undefined;
}): Promise<HttpResponse<ResultadoFefo>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!(params.quantidade > 0)) {
		return httpBadRequest("Quantidade deve ser maior que zero");
	}

	const produto = await buscarProdutoPorId(params.idproduto);
	if (!produto || produto.idempresa !== params.idempresa) {
		return httpNaoEncontrado();
	}

	const resultado = await resolverLotesFefo({
		idempresa: params.idempresa,
		idproduto: params.idproduto,
		quantidade: params.quantidade,
		idcfop: params.idcfop,
		dataReferencia: params.dataReferencia,
	});

	return httpOk(resultado);
}
