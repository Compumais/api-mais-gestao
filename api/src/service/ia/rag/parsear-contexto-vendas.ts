import type { RelatorioFiscalNotaItem } from "@/repositories/nota-fiscal-repositories.js";
import {
	formatCurrency,
	obterNumeroDocumento,
	parseDecimal,
} from "@/service/relatorios/relatorio-fiscal-format.js";
import type { PeriodoVendas } from "@/service/ia/pergunta-vendas-periodo.js";

const LIMITE_DOCUMENTOS = 12;

export type DocumentoVendaParseado = {
	emissao: string | null;
	numero: string;
	modelo: "NF-e" | "NFC-e";
	cliente: string | null;
	valor: number;
};

export type ContextoVendasParseado = {
	fonte: "notas-fiscais-autorizadas";
	periodo: PeriodoVendas;
	quantidadeNfe: number;
	quantidadeNfce: number;
	quantidadeTotal: number;
	valorNfe: number;
	valorNfce: number;
	valorTotal: number;
	documentos: DocumentoVendaParseado[];
};

function modeloDocumento(nota: RelatorioFiscalNotaItem): "NF-e" | "NFC-e" {
	return nota.modelo === "65" ? "NFC-e" : "NF-e";
}

export function parsearNotasVendas(
	notas: RelatorioFiscalNotaItem[],
	periodo: PeriodoVendas,
): ContextoVendasParseado {
	const documentos = notas.slice(0, LIMITE_DOCUMENTOS).map((nota) => ({
		emissao: nota.emissao,
		numero: obterNumeroDocumento(nota),
		modelo: modeloDocumento(nota),
		cliente: nota.parceiroNome?.trim() || null,
		valor: parseDecimal(nota.valortotalnota),
	}));

	let quantidadeNfe = 0;
	let quantidadeNfce = 0;
	let valorNfe = 0;
	let valorNfce = 0;

	for (const nota of notas) {
		const valor = parseDecimal(nota.valortotalnota);
		if (nota.modelo === "65") {
			quantidadeNfce += 1;
			valorNfce += valor;
		} else {
			quantidadeNfe += 1;
			valorNfe += valor;
		}
	}

	return {
		fonte: "notas-fiscais-autorizadas",
		periodo,
		quantidadeNfe,
		quantidadeNfce,
		quantidadeTotal: notas.length,
		valorNfe,
		valorNfce,
		valorTotal: valorNfe + valorNfce,
		documentos,
	};
}

export function contextoVendasParaPrompt(ctx: ContextoVendasParseado): string {
	const linhas = [
		`Fonte: notas fiscais autorizadas de ${ctx.periodo.rotulo} (${ctx.periodo.dataInicio} a ${ctx.periodo.dataFim}).`,
		`NF-e: ${ctx.quantidadeNfe} documento(s), total ${formatCurrency(ctx.valorNfe)}.`,
		`NFC-e: ${ctx.quantidadeNfce} documento(s), total ${formatCurrency(ctx.valorNfce)}.`,
		`Total: ${ctx.quantidadeTotal} documento(s), ${formatCurrency(ctx.valorTotal)}.`,
	];

	if (ctx.documentos.length === 0) {
		linhas.push("Nenhuma nota autorizada nesse período.");
		return linhas.join("\n");
	}

	linhas.push("Documentos mais recentes:");
	for (const doc of ctx.documentos) {
		linhas.push(
			`- ${doc.emissao ?? "-"} ${doc.modelo} ${doc.numero} ${doc.cliente ?? "-"} ${formatCurrency(doc.valor)}`,
		);
	}
	if (ctx.quantidadeTotal > ctx.documentos.length) {
		linhas.push(
			`Há mais ${ctx.quantidadeTotal - ctx.documentos.length} documento(s) no total, fora desta lista.`,
		);
	}
	return linhas.join("\n");
}
