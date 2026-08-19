export type OpcaoCst = {
	value: string;
	label: string;
};

export function formatarCstProduto(
	valor?: string | number | null,
	tamanho = 2,
): string {
	if (valor === null || valor === undefined || valor === "") {
		return "";
	}

	const digitos = String(valor).replace(/\D/g, "");
	if (!digitos) return "";

	return digitos.padStart(tamanho, "0").slice(-tamanho);
}

export const OPCOES_CST_ICMS: OpcaoCst[] = [
	{ value: "00", label: "00 - Tributada integralmente" },
	{ value: "10", label: "10 - Tributada com cobrança do ICMS por ST" },
	{ value: "20", label: "20 - Com redução de base de cálculo" },
	{
		value: "30",
		label: "30 - Isenta/não tributada e com cobrança do ICMS por ST",
	},
	{ value: "40", label: "40 - Isenta" },
	{ value: "41", label: "41 - Não tributada" },
	{ value: "50", label: "50 - Suspensão" },
	{ value: "51", label: "51 - Diferimento" },
	{ value: "60", label: "60 - ICMS cobrado anteriormente por ST" },
	{
		value: "70",
		label: "70 - Com redução de BC e cobrança do ICMS por ST",
	},
	{ value: "90", label: "90 - Outras" },
];

export const OPCOES_CSOSN: OpcaoCst[] = [
	{
		value: "101",
		label: "101 - Tributada pelo SN com permissão de crédito",
	},
	{
		value: "102",
		label: "102 - Tributada pelo SN sem permissão de crédito",
	},
	{
		value: "103",
		label: "103 - Isenção do ICMS no SN para faixa de receita bruta",
	},
	{
		value: "201",
		label: "201 - Tributada pelo SN com crédito e cobrança do ICMS por ST",
	},
	{
		value: "202",
		label: "202 - Tributada pelo SN sem crédito e cobrança do ICMS por ST",
	},
	{
		value: "203",
		label:
			"203 - Isenção no SN para faixa de receita e cobrança do ICMS por ST",
	},
	{ value: "300", label: "300 - Imune" },
	{ value: "400", label: "400 - Não tributada pelo Simples Nacional" },
	{
		value: "500",
		label: "500 - ICMS cobrado anteriormente por ST ou antecipação",
	},
	{ value: "900", label: "900 - Outros" },
];

export const OPCOES_CST_PIS_COFINS: OpcaoCst[] = [
	{ value: "01", label: "01 - Operação tributável (alíquota básica)" },
	{ value: "02", label: "02 - Operação tributável (alíquota diferenciada)" },
	{ value: "03", label: "03 - Operação tributável (alíquota por unidade)" },
	{ value: "04", label: "04 - Monofásica (alíquota zero)" },
	{ value: "05", label: "05 - Substituição tributária" },
	{ value: "06", label: "06 - Alíquota zero" },
	{ value: "07", label: "07 - Operação isenta" },
	{ value: "08", label: "08 - Sem incidência" },
	{ value: "09", label: "09 - Suspensão" },
	{ value: "49", label: "49 - Outras operações de saída" },
	{ value: "50", label: "50 - Operação com direito a crédito" },
	{
		value: "51",
		label: "51 - Crédito vinculado à receita tributada no mercado interno",
	},
	{
		value: "53",
		label: "53 - Crédito vinculado à receita não tributada no mercado interno",
	},
	{ value: "60", label: "60 - Crédito presumido de operação de aquisição" },
	{ value: "70", label: "70 - Operação de aquisição sem direito a crédito" },
	{ value: "71", label: "71 - Operação de aquisição com isenção" },
	{ value: "72", label: "72 - Operação de aquisição com suspensão" },
	{ value: "73", label: "73 - Operação de aquisição a alíquota zero" },
	{ value: "74", label: "74 - Operação de aquisição sem incidência" },
	{
		value: "75",
		label: "75 - Operação de aquisição por substituição tributária",
	},
	{ value: "98", label: "98 - Outras operações de entrada" },
	{ value: "99", label: "99 - Outras operações" },
];
