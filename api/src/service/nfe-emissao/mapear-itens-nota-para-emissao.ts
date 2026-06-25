import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";

function mapearSituacaoTributaria(
	situacao: string | null | undefined,
): Pick<ItemPayloadNfe, "cst" | "csosn"> {
	if (!situacao?.trim()) {
		return {};
	}

	const codigo = situacao.trim();
	if (codigo.length === 3) {
		return { csosn: codigo };
	}

	return { cst: codigo };
}

export function mapearItensNotaParaEmissao(
	itens: NotaFiscalItem[],
): ItemPayloadNfe[] {
	return itens.map((item) => {
		const quantidade = Number(item.quantidade ?? 0);
		const valorUnitario = Number(item.precounitario ?? 0);
		const tributacao = mapearSituacaoTributaria(item.situacaotributaria);

		return {
			idproduto: item.idproduto ?? undefined,
			descricao: item.descricao ?? "Item",
			ncm: item.ncm ?? "00000000",
			cfop: item.cfop ?? "5102",
			unidade: item.unidade ?? "UN",
			quantidade: quantidade > 0 ? quantidade : 1,
			valorUnitario: valorUnitario > 0 ? valorUnitario : 0.01,
			...tributacao,
			orig: item.origem ?? 0,
			cstPis: item.cstpis ?? undefined,
			cstCofins: item.cstcofins ?? undefined,
			baseIcms: item.baseicms ? Number(item.baseicms) : undefined,
			aliquotaIcms: item.percentualicms
				? Number(item.percentualicms)
				: undefined,
		};
	});
}
