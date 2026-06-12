import type { CustoProduto } from "@/model/custo-produto-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCustoProdutoPorId } from "@/repositories/custo-produto-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";
import { validarAcessoProduto } from "./validar-acesso-produto.js";

type BuscarCustoProdutoParametros = {
	custoProdutoId: string;
	idusuario: string;
};

export async function buscarCustoProdutoService({
	custoProdutoId,
	idusuario,
}: BuscarCustoProdutoParametros): Promise<HttpResponse<CustoProduto | null>> {
	const registro = await buscarCustoProdutoPorId(custoProdutoId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const validacao = await validarAcessoProduto(idusuario, registro.idproduto);

	if (!validacao.sucesso) {
		return validacao.resposta;
	}

	return httpOk<CustoProduto>(registro);
}
