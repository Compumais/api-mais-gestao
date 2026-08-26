import {
	campoDataDdmmaaaa,
	campoDecimal,
	campoTexto,
	montarLinhaPipe,
	parseNumeroEfd,
} from "@/util/efd/formatador-pipe.js";
import type { AjusteApuracaoEfd } from "../tipos-efd-icms.js";
import type { AgrupamentoC190 } from "./bloco-c.js";

export function montarRegistroE001(indMov: "0" | "1"): string {
	return montarLinhaPipe(["E001", indMov]);
}

export function montarRegistroE100(
	dataInicio: string,
	dataFim: string,
): string {
	return montarLinhaPipe([
		"E100",
		campoDataDdmmaaaa(dataInicio),
		campoDataDdmmaaaa(dataFim),
	]);
}

export function calcularTotaisE110(
	gruposPorNota: Array<{ indOper: "0" | "1"; grupos: AgrupamentoC190[] }>,
	ajustes: AjusteApuracaoEfd[],
): {
	debitos: number;
	creditos: number;
	ajDebitos: number;
	ajCreditos: number;
	apurado: number;
	recolher: number;
	credor: number;
} {
	let debitos = 0;
	let creditos = 0;
	for (const nota of gruposPorNota) {
		const icms = nota.grupos.reduce((acc, g) => acc + g.valorIcms, 0);
		if (nota.indOper === "1") debitos += icms;
		else creditos += icms;
	}
	const ajDebitos = ajustes
		.filter((a) => a.natureza === "debito")
		.reduce((acc, a) => acc + parseNumeroEfd(a.valor), 0);
	const ajCreditos = ajustes
		.filter((a) => a.natureza === "credito")
		.reduce((acc, a) => acc + parseNumeroEfd(a.valor), 0);

	const saldo = debitos + ajDebitos - creditos - ajCreditos;
	return {
		debitos,
		creditos,
		ajDebitos,
		ajCreditos,
		apurado: Math.max(0, saldo),
		recolher: Math.max(0, saldo),
		credor: Math.max(0, -saldo),
	};
}

export function montarRegistroE110(
	totais: ReturnType<typeof calcularTotaisE110>,
): string {
	return montarLinhaPipe([
		"E110",
		campoDecimal(totais.debitos),
		campoDecimal(totais.ajDebitos),
		"0,00",
		"0,00",
		campoDecimal(totais.creditos),
		campoDecimal(totais.ajCreditos),
		"0,00",
		"0,00",
		"0,00",
		campoDecimal(totais.apurado),
		"0,00",
		campoDecimal(totais.recolher),
		campoDecimal(totais.credor),
		"0,00",
	]);
}

export function montarRegistroE111(ajuste: AjusteApuracaoEfd): string {
	return montarLinhaPipe([
		"E111",
		campoTexto(ajuste.codigoajuste, 8),
		campoTexto(ajuste.descricao, 255),
		campoDecimal(ajuste.valor),
	]);
}

export function montarRegistroE990(qtdLinhas: number): string {
	return montarLinhaPipe(["E990", String(qtdLinhas)]);
}
