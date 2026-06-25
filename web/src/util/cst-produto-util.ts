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
		label: "203 - Isenção no SN para faixa de receita e cobrança do ICMS por ST",
	},
	{ value: "300", label: "300 - Imune" },
	{ value: "400", label: "400 - Não tributada pelo Simples Nacional" },
	{
		value: "500",
		label: "500 - ICMS cobrado anteriormente por ST ou antecipação",
	},
	{ value: "900", label: "900 - Outros" },
];
