import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { extrairTributacaoItemEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";

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

function paraNumero(valor: string | number | null | undefined): number | undefined {
	if (valor == null || valor === "") return undefined;
	const numero = typeof valor === "number" ? valor : Number.parseFloat(String(valor));
	return Number.isFinite(numero) ? numero : undefined;
}

export function mapearItensNotaParaEmissao(
	itens: NotaFiscalItem[],
): ItemPayloadNfe[] {
	return itens.map((item) => {
		const quantidade = Number(item.quantidade ?? 0);
		const valorUnitario = Number(item.precounitario ?? 0);
		const tributacao = mapearSituacaoTributaria(item.situacaotributaria);
		const tributacaoSalva = extrairTributacaoItemEmissaoNfe(item.dadosimportacao);
		const pCredSN = paraNumero(tributacaoSalva?.pCredSN);
		const vCredICMSSN = paraNumero(tributacaoSalva?.vCredICMSSN);
		const aliquotaIcms =
			paraNumero(item.percentualicms) ?? pCredSN;

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
			...(aliquotaIcms != null ? { aliquotaIcms } : {}),
			...(pCredSN != null ? { pCredSN } : {}),
			...(vCredICMSSN != null ? { vCredICMSSN } : {}),
		};
	});
}
