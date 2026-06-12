import type { HttpResponse } from "@/model/http-model.js";
import type { Produto } from "@/model/produto-model.js";
import { atualizarProdutoService } from "@/service/produto/atualizar-produto.js";

type InativarProdutoParametros = {
	produtoId: string;
	idusuario: string;
	inativo: number;
};

export async function inativarProdutoService({
	produtoId,
	idusuario,
	inativo,
}: InativarProdutoParametros): Promise<HttpResponse<Produto | null>> {
	return atualizarProdutoService({
		produtoId,
		idusuario,
		dados: { inativo },
	});
}
