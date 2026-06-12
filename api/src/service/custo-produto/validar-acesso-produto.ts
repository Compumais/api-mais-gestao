import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpProibido } from "@/util/http-util.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { Produto } from "@/model/produto-model.js";

type ValidarAcessoProdutoResultado =
	| { sucesso: true; produto: Produto }
	| { sucesso: false; resposta: HttpResponse<never> };

export async function validarAcessoProduto(
	idusuario: string,
	idproduto: string,
): Promise<ValidarAcessoProdutoResultado> {
	const produto = await buscarProdutoPorId(idproduto);

	if (!produto) {
		return { sucesso: false, resposta: httpNaoEncontrado() };
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		produto.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return { sucesso: false, resposta: httpProibido() };
	}

	return { sucesso: true, produto };
}
