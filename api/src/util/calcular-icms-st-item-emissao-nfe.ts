import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	CST_COM_ST,
	CSOSN_COM_ST,
} from "@/service/fiscal/indicadores-st-nfe.js";

const CSOSN_ST_MVA = new Set(["201", "202", "203"]);

export function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

export function calcularValorProdutoItem(
	quantidade: number,
	valorUnitario: number,
): number {
	return round2(quantidade * valorUnitario);
}

export function calcularBaseIcmsSt(
	vProd: number,
	mva: number,
	baseManual?: number | null,
): number {
	if (baseManual != null) {
		return round2(baseManual);
	}
	return round2(vProd * (1 + mva / 100));
}

export function calcularValorIcmsSt(params: {
	vProd: number;
	baseIcmsSt: number;
	aliquotaIcmsSt: number;
	aliquotaIcmsProprio?: number | null;
}): number {
	const stBruto = round2((params.baseIcmsSt * params.aliquotaIcmsSt) / 100);
	const aliquotaProprio = params.aliquotaIcmsProprio ?? 0;
	const icmsProprio =
		aliquotaProprio > 0
			? round2((params.vProd * aliquotaProprio) / 100)
			: 0;
	return round2(Math.max(0, stBruto - icmsProprio));
}

export function calcularValorFcpSt(params: {
	baseIcmsSt: number;
	aliquotaFcpSt?: number | null;
	valorFcpStManual?: number | null;
}): number | undefined {
	const aliquota = params.aliquotaFcpSt;
	if (aliquota == null || aliquota <= 0 || params.baseIcmsSt <= 0) {
		return params.valorFcpStManual != null
			? round2(params.valorFcpStManual)
			: undefined;
	}
	return round2((params.baseIcmsSt * aliquota) / 100);
}

export function resolverAliquotaIcmsProprioSt(item: {
	aliquotaIcmsProprioSt?: number | null;
	aliquotaIcms?: number | null;
}): number | null {
	if (item.aliquotaIcmsProprioSt != null && item.aliquotaIcmsProprioSt > 0) {
		return item.aliquotaIcmsProprioSt;
	}
	if (item.aliquotaIcms != null && item.aliquotaIcms > 0) {
		return item.aliquotaIcms;
	}
	return null;
}

export function itemExigeCalculoSt(item: {
	cst?: string | null;
	csosn?: string | null;
	percentualMvaSt?: number | null;
	aliquotaIcmsSt?: number | null;
}): boolean {
	const cst = item.cst?.replace(/\D/g, "") ?? "";
	const csosn = item.csosn?.replace(/\D/g, "") ?? "";

	if (CSOSN_ST_MVA.has(csosn) || CST_COM_ST.has(cst)) {
		return true;
	}

	return (
		item.percentualMvaSt != null &&
		item.percentualMvaSt >= 0 &&
		item.aliquotaIcmsSt != null
	);
}

export function calcularIcmsStItemEmissao(
	item: Pick<
		ItemPayloadNfe,
		| "quantidade"
		| "valorUnitario"
		| "percentualMvaSt"
		| "aliquotaIcmsSt"
		| "aliquotaIcms"
		| "aliquotaIcmsProprioSt"
		| "aliquotaFcpSt"
		| "baseIcmsSt"
		| "valorIcmsSt"
		| "valorFcpSt"
	> & {
		cst?: string | null;
		csosn?: string | null;
	},
): {
	baseIcmsSt?: number;
	valorIcmsSt?: number;
	valorFcpSt?: number;
} {
	if (!itemExigeCalculoSt(item)) {
		return {};
	}

	const mva = item.percentualMvaSt;
	const aliquotaSt = item.aliquotaIcmsSt;
	if (mva == null || mva < 0 || aliquotaSt == null) {
		return {};
	}

	const vProd = calcularValorProdutoItem(item.quantidade, item.valorUnitario);
	if (vProd <= 0) {
		return {};
	}

	const baseIcmsSt = calcularBaseIcmsSt(vProd, mva, item.baseIcmsSt);
	const valorIcmsSt = calcularValorIcmsSt({
		vProd,
		baseIcmsSt,
		aliquotaIcmsSt: aliquotaSt,
		aliquotaIcmsProprio: resolverAliquotaIcmsProprioSt(item),
	});
	const valorFcpSt = calcularValorFcpSt({
		baseIcmsSt,
		aliquotaFcpSt: item.aliquotaFcpSt,
		valorFcpStManual: item.valorFcpSt,
	});

	return {
		baseIcmsSt,
		valorIcmsSt,
		...(valorFcpSt != null ? { valorFcpSt } : {}),
	};
}

export function recalcularIcmsStItemEmissao<T extends ItemPayloadNfe>(item: T): T {
	const csosn = item.csosn?.replace(/\D/g, "") ?? "";
	if (csosn === "500" || !itemExigeCalculoSt(item)) {
		return item;
	}

	const calculado = calcularIcmsStItemEmissao(item);
	if (calculado.baseIcmsSt == null || calculado.valorIcmsSt == null) {
		return item;
	}

	const aliquotaProprio = resolverAliquotaIcmsProprioSt(item);
	const semAliquotaInterna = aliquotaProprio == null;

	// Sem alíquota interna: recalcula a base/FCP, mas preserva o vST já informado
	// (evita divergência painel × DANFE quando o payload veio sem dedução).
	if (semAliquotaInterna && item.valorIcmsSt != null) {
		return {
			...item,
			baseIcmsSt: calculado.baseIcmsSt,
			valorIcmsSt: item.valorIcmsSt,
			...(calculado.valorFcpSt != null
				? { valorFcpSt: calculado.valorFcpSt }
				: {}),
		};
	}

	return {
		...item,
		baseIcmsSt: calculado.baseIcmsSt,
		valorIcmsSt: calculado.valorIcmsSt,
		...(calculado.valorFcpSt != null
			? { valorFcpSt: calculado.valorFcpSt }
			: {}),
	};
}

export function recalcularIcmsStItensEmissao<T extends ItemPayloadNfe>(
	itens: T[],
): T[] {
	return itens.map((item) => recalcularIcmsStItemEmissao(item));
}

export function itemCsosnComStMva(csosn?: string | null): boolean {
	const codigo = csosn?.replace(/\D/g, "") ?? "";
	return CSOSN_ST_MVA.has(codigo) || CSOSN_COM_ST.has(codigo);
}
