import type { HttpResponse } from "@/model/http-model.js";
import type { Produto } from "@/model/produto-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarProdutoParametros = {
	produtoId: string;
	idusuario: string;
};

export async function buscarProdutoService({
	produtoId,
	idusuario,
}: BuscarProdutoParametros): Promise<HttpResponse<Produto | null>> {
	const registro = await buscarProdutoPorId(produtoId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<Produto>(registro);
}
