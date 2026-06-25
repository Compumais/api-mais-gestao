const CSOSN_EXIGE_CREDITO_SN = new Set(["101", "201"]);

export type CreditoIcmsSnItem = {
	pCredSN?: number;
	vCredICMSSN?: number;
	pendencia?: string;
};

function paraNumero(valor: string | number | null | undefined): number | undefined {
	if (valor == null || valor === "") return undefined;
	const numero = typeof valor === "number" ? valor : Number.parseFloat(String(valor));
	return Number.isFinite(numero) ? numero : undefined;
}

export function csosnExigeCreditoSn(csosn?: string | null): boolean {
	if (!csosn?.trim()) return false;
	return CSOSN_EXIGE_CREDITO_SN.has(csosn.trim());
}

export function resolverCreditoIcmsSnItem({
	csosn,
	valorProduto,
	pCredSN,
	vCredICMSSN,
	aliquotaIcmsInterna,
}: {
	csosn?: string | null;
	valorProduto: number;
	pCredSN?: number;
	vCredICMSSN?: number;
	aliquotaIcmsInterna?: string | number | null;
}): CreditoIcmsSnItem {
	if (!csosnExigeCreditoSn(csosn)) {
		return {};
	}

	const aliquota =
		pCredSN ??
		paraNumero(aliquotaIcmsInterna);

	if (aliquota == null || aliquota <= 0) {
		return {
			pendencia:
				"CSOSN 101/201 exige alíquota de crédito ICMS (pCredSN). Preencha a alíquota ICMS interna no produto ou use CSOSN 102 para venda sem crédito.",
		};
	}

	const valorCredito =
		vCredICMSSN ??
		(valorProduto > 0 ? Math.round((valorProduto * aliquota) / 100 * 100) / 100 : 0);

	return {
		pCredSN: Math.round(aliquota * 10000) / 10000,
		vCredICMSSN: Math.round(valorCredito * 100) / 100,
	};
}
