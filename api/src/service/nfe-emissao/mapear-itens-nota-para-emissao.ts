import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { listarLotesPorItensNota } from "@/repositories/nota-fiscal-item-lote-repositories.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { extrairTributacaoItemEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";
import { normalizarCstPisCofins } from "@/util/montar-grupo-pis-cofins-item-nfe.js";
import { normalizarCodigoCest } from "@/util/validar-cest-item-emissao-nfe.js";

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

function paraNumero(
	valor: string | number | null | undefined,
): number | undefined {
	if (valor == null || valor === "") return undefined;
	const numero =
		typeof valor === "number" ? valor : Number.parseFloat(String(valor));
	return Number.isFinite(numero) ? numero : undefined;
}

export async function mapearItensNotaParaEmissao(
	itens: NotaFiscalItem[],
): Promise<ItemPayloadNfe[]> {
	const lotes = await listarLotesPorItensNota(itens.map((item) => item.id));
	const lotesPorItem = new Map<string, typeof lotes>();
	for (const lote of lotes) {
		const atuais = lotesPorItem.get(lote.idnotafiscalitem) ?? [];
		atuais.push(lote);
		lotesPorItem.set(lote.idnotafiscalitem, atuais);
	}

	return itens.map((item) => {
		const quantidade = Number(item.quantidade ?? 0);
		const valorUnitario = Number(item.precounitario ?? 0);
		const tributacao = mapearSituacaoTributaria(item.situacaotributaria);
		const tributacaoSalva = extrairTributacaoItemEmissaoNfe(
			item.dadosimportacao,
		);
		const pCredSN = paraNumero(tributacaoSalva?.pCredSN);
		const vCredICMSSN = paraNumero(tributacaoSalva?.vCredICMSSN);
		const usaCsosn = Boolean(tributacao.csosn);
		// No Simples, percentualicms/pCredSN não viram aliquotaIcms (crédito fica só em pCredSN).
		const aliquotaIcms = usaCsosn ? undefined : paraNumero(item.percentualicms);
		const baseIcms = usaCsosn
			? undefined
			: item.baseicms
				? Number(item.baseicms)
				: undefined;

		const cest =
			normalizarCodigoCest(tributacaoSalva?.cest) ??
			normalizarCodigoCest(
				(
					item.dadosimportacao as
						| { tributacao?: { cest?: string }; cestXml?: string }
						| null
						| undefined
				)?.tributacao?.cest,
			) ??
			normalizarCodigoCest(
				(item.dadosimportacao as { cestXml?: string } | null | undefined)
					?.cestXml,
			);

		const aliquotaPis = paraNumero(item.aliquotapis);
		const aliquotaCofins = paraNumero(item.aliquotacofins);
		const baseIcmsSt =
			paraNumero(tributacaoSalva?.baseIcmsSt) ??
			paraNumero(
				(
					item.dadosimportacao as {
						tributacao?: { baseicmsst?: string };
					} | null
				)?.tributacao?.baseicmsst,
			);
		const valorIcmsSt =
			paraNumero(tributacaoSalva?.valorIcmsSt) ??
			paraNumero(
				(item.dadosimportacao as { tributacao?: { icmsst?: string } } | null)
					?.tributacao?.icmsst,
			);
		const percentualMvaSt = paraNumero(tributacaoSalva?.percentualMvaSt);
		const aliquotaIcmsSt = paraNumero(tributacaoSalva?.aliquotaIcmsSt);
		const aliquotaFcpSt = paraNumero(tributacaoSalva?.aliquotaFcpSt);
		const valorFcpSt =
			paraNumero(tributacaoSalva?.valorFcpSt) ??
			paraNumero(
				(item.dadosimportacao as { tributacao?: { fcpst?: string } } | null)
					?.tributacao?.fcpst,
			);
		const valorFcpStRet = paraNumero(tributacaoSalva?.valorFcpStRet);
		const rastrosItem = lotesPorItem.get(item.id) ?? [];
		const rastros =
			rastrosItem.length > 0
				? rastrosItem.map((lote) => ({
						idlote: lote.idlote ?? undefined,
						nLote: lote.numero,
						qLote: Number.parseFloat(lote.quantidade) || 0,
						dFab: lote.datafabricacao ?? undefined,
						dVal: lote.datavalidade ?? undefined,
						cAgreg: lote.codigoagregacao ?? undefined,
					}))
				: undefined;

		return {
			idproduto: item.idproduto ?? undefined,
			descricao: item.descricao ?? "Item",
			ncm: item.ncm ?? "00000000",
			...(cest ? { cest } : {}),
			cfop: item.cfop ?? "",
			unidade: item.unidade ?? "UN",
			quantidade: quantidade > 0 ? quantidade : 1,
			valorUnitario: valorUnitario > 0 ? valorUnitario : 0.01,
			...tributacao,
			orig: item.origem ?? 0,
			cstPis: normalizarCstPisCofins(item.cstpis),
			cstCofins: normalizarCstPisCofins(item.cstcofins),
			...(aliquotaPis != null ? { aliquotaPis } : {}),
			...(aliquotaCofins != null ? { aliquotaCofins } : {}),
			...(baseIcms != null ? { baseIcms } : {}),
			...(aliquotaIcms != null ? { aliquotaIcms } : {}),
			...(baseIcmsSt != null ? { baseIcmsSt } : {}),
			...(valorIcmsSt != null ? { valorIcmsSt } : {}),
			...(percentualMvaSt != null ? { percentualMvaSt } : {}),
			...(aliquotaIcmsSt != null ? { aliquotaIcmsSt } : {}),
			...(aliquotaFcpSt != null ? { aliquotaFcpSt } : {}),
			...(valorFcpSt != null ? { valorFcpSt } : {}),
			...(valorFcpStRet != null ? { valorFcpStRet } : {}),
			...(pCredSN != null ? { pCredSN } : {}),
			...(vCredICMSSN != null ? { vCredICMSSN } : {}),
			...(rastros ? { rastros } : {}),
		};
	});
}
