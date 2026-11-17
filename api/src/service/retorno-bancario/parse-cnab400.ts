import {
	parseDataCnab6,
	parseValorCentavos,
	somenteDigitos,
} from "@/service/remessa-bancaria/cnab-utils.js";
import type {
	OcorrenciaRetornoCnab,
	ResultadoParseRetorno,
} from "@/service/retorno-bancario/tipos.js";

const DESCRICOES_OCORRENCIA: Record<string, string> = {
	"02": "Entrada confirmada",
	"03": "Entrada rejeitada",
	"06": "Liquidação normal",
	"09": "Baixado automaticamente",
	"10": "Baixado conforme instruções",
	"15": "Liquidação em cartório",
	"17": "Liquidação após baixa",
};

export function parseArquivoCnab400(conteudo: string): ResultadoParseRetorno {
	const linhas = conteudo
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((l) => l.replace(/\s+$/g, "").padEnd(400, " "))
		.filter((l) => l.trim().length > 0);

	const itens: OcorrenciaRetornoCnab[] = [];

	for (const linha of linhas) {
		if (linha.length < 400) continue;
		const tipo = linha.slice(0, 1);
		if (tipo !== "1") continue;

		const ocorrencia = linha.slice(108, 110);
		const nossonumeroBruto = linha.slice(70, 82).trim();
		const nossonumero =
			somenteDigitos(nossonumeroBruto).replace(/0+$/, "") ||
			somenteDigitos(nossonumeroBruto) ||
			nossonumeroBruto;

		itens.push({
			nossonumero,
			numerodocumento: linha.slice(116, 126).trim() || null,
			nomesacado: null,
			valor: parseValorCentavos(linha.slice(152, 165)),
			valorpago: parseValorCentavos(linha.slice(253, 266)),
			vencimento: parseDataCnab6(linha.slice(146, 152)),
			datacredito: parseDataCnab6(linha.slice(295, 301)),
			dataocorrencia: parseDataCnab6(linha.slice(110, 116)),
			ocorrencia,
			ocorrenciadescricao: DESCRICOES_OCORRENCIA[ocorrencia] ?? null,
			motivo: linha.slice(318, 328).trim() || null,
			desconto: parseValorCentavos(linha.slice(240, 253)),
			abatimento: parseValorCentavos(linha.slice(227, 240)),
			juros: parseValorCentavos(linha.slice(266, 279)),
			multa: "0.00",
			outrosacrescimos: parseValorCentavos(linha.slice(279, 292)),
			taxacobranca: parseValorCentavos(linha.slice(175, 188)),
			valoriof: parseValorCentavos(linha.slice(214, 227)),
			raw: linha,
		});
	}

	return { itens, layoutDetectado: "cnab400" };
}
