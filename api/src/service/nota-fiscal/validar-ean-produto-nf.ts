import type { Produto } from "@/model/produto-model.js";
import { buscarProdutoPorCodigoOuEan } from "@/repositories/produtos-repositories.js";
import { normalizarCodigoBarras } from "@/util/texto-util.js";

type ValidarEanProdutoNfResultado =
	| { valido: true }
	| { valido: false; mensagem: string; produtoExistente: Produto };

export async function validarEanProdutoNf(
	idempresa: string,
	eanBruto: string | undefined | null,
	idprodutoIgnorar?: string | undefined,
): Promise<ValidarEanProdutoNfResultado> {
	const ean = normalizarCodigoBarras(eanBruto);

	if (!ean) {
		return { valido: true };
	}

	const produtoExistente = await buscarProdutoPorCodigoOuEan(
		idempresa,
		undefined,
		ean,
	);

	if (!produtoExistente) {
		return { valido: true };
	}

	if (idprodutoIgnorar && produtoExistente.id === idprodutoIgnorar) {
		return { valido: true };
	}

	const nomeProduto =
		produtoExistente.nome ?? produtoExistente.descricao ?? "Produto";

	return {
		valido: false,
		mensagem: `O código de barras ${ean} já pertence ao produto "${nomeProduto}". Use Localizar para vincular.`,
		produtoExistente,
	};
}
