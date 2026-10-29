import type { ItemNfe } from "@mais-gestao/nfe-emissao-shared";
import type { Produto } from "@/src/api/services/produtos.service";

export function mapearProdutoParaItem(
	produto: Produto,
	cfop = "5102",
): ItemNfe {
	const preco = produto.preco ? Number.parseFloat(produto.preco) : 0;
	return {
		idproduto: produto.id,
		codigoProduto:
			produto.codigo != null ? String(produto.codigo) : undefined,
		descricao: produto.nome,
		ncm: produto.ncm ?? "",
		cfop,
		unidade: (produto.unidademedida?.trim() || "UN").slice(0, 6),
		quantidade: 1,
		valorUnitario: Number.isFinite(preco) && preco > 0 ? preco : 0.01,
		orig: produto.origem ?? 0,
		cst: produto.situacaotributaria ?? undefined,
		csosn: produto.situacaotributariasn ?? undefined,
		cstPis: produto.cstpis != null ? String(produto.cstpis) : undefined,
		cstCofins:
			produto.cstcofins != null ? String(produto.cstcofins) : undefined,
		controlaLote: produto.controlalote === 1,
	};
}
