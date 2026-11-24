import {
	parseDataCnab8,
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
	"06": "Liquidação",
	"09": "Baixa",
	"10": "Baixa conforme instruções",
	"15": "Liquidação em cartório",
	"17": "Liquidação após baixa",
};

export function parseArquivoCnab240(conteudo: string): ResultadoParseRetorno {
	const linhas = conteudo
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((l) => l.replace(/\s+$/g, "").padEnd(240, " "))
		.filter((l) => l.trim().length > 0);

	const porSequencia = new Map<
		string,
		Partial<OcorrenciaRetornoCnab> & { rawParts: string[] }
	>();

	for (const linha of linhas) {
		if (linha.length < 240) continue;
		const tipoRegistro = linha.slice(7, 8);
		if (tipoRegistro !== "3") continue;

		const segmento = linha.slice(13, 14);
		const seq = linha.slice(8, 13);

		if (segmento === "T") {
			const nossonumero = linha.slice(37, 57).trim();
			const ocorrencia = linha.slice(15, 17);
			const numerodocumento = linha.slice(58, 73).trim();
			const vencimento = parseDataCnab8(linha.slice(73, 81));
			const valor = parseValorCentavos(linha.slice(81, 96));
			const nomesacado = linha.slice(148, 188).trim() || null;
			porSequencia.set(seq, {
				nossonumero: somenteDigitos(nossonumero) || nossonumero,
				numerodocumento: numerodocumento || null,
				vencimento,
				valor,
				ocorrencia,
				ocorrenciadescricao: DESCRICOES_OCORRENCIA[ocorrencia] ?? null,
				nomesacado,
				rawParts: [linha],
			});
		}

		if (segmento === "U") {
			const atual = porSequencia.get(seq) ?? {
				nossonumero: "",
				ocorrencia: linha.slice(15, 17),
				rawParts: [],
			};
			atual.juros = parseValorCentavos(linha.slice(17, 32));
			atual.desconto = parseValorCentavos(linha.slice(32, 47));
			atual.abatimento = parseValorCentavos(linha.slice(47, 62));
			atual.valoriof = parseValorCentavos(linha.slice(62, 77));
			atual.valorpago = parseValorCentavos(linha.slice(77, 92));
			atual.outrosacrescimos = parseValorCentavos(linha.slice(92, 107));
			atual.dataocorrencia = parseDataCnab8(linha.slice(137, 145));
			atual.datacredito = parseDataCnab8(linha.slice(145, 153));
			atual.multa = "0.00";
			atual.taxacobranca = "0.00";
			atual.motivo = linha.slice(208, 218).trim() || null;
			atual.rawParts = [...(atual.rawParts ?? []), linha];
			if (!atual.ocorrencia) {
				atual.ocorrencia = linha.slice(15, 17);
				atual.ocorrenciadescricao =
					DESCRICOES_OCORRENCIA[atual.ocorrencia] ?? null;
			}
			porSequencia.set(seq, atual);
		}
	}

	const itens: OcorrenciaRetornoCnab[] = [];
	for (const item of porSequencia.values()) {
		if (!item.nossonumero && !item.numerodocumento) continue;
		itens.push({
			nossonumero: item.nossonumero ?? "",
			numerodocumento: item.numerodocumento ?? null,
			nomesacado: item.nomesacado ?? null,
			valor: item.valor ?? null,
			valorpago: item.valorpago ?? null,
			vencimento: item.vencimento ?? null,
			datacredito: item.datacredito ?? null,
			dataocorrencia: item.dataocorrencia ?? null,
			ocorrencia: item.ocorrencia ?? "",
			ocorrenciadescricao: item.ocorrenciadescricao ?? null,
			motivo: item.motivo ?? null,
			desconto: item.desconto ?? null,
			abatimento: item.abatimento ?? null,
			juros: item.juros ?? null,
			multa: item.multa ?? null,
			outrosacrescimos: item.outrosacrescimos ?? null,
			taxacobranca: item.taxacobranca ?? null,
			valoriof: item.valoriof ?? null,
			raw: (item.rawParts ?? []).join("\n"),
		});
	}

	return { itens, layoutDetectado: "cnab240" };
}
