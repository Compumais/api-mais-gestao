import type { AgrupamentoRegistro50 } from "./tipos-sintegra.js";

export type ValoresRegistro53 = {
	agrupamento: AgrupamentoRegistro50;
	baseIcmsSt: number;
	valorIcmsSt: number;
};

function parseNumero(valor: string | null | undefined): number {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	return Number.isFinite(numero) ? numero : 0;
}

/**
 * Um registro 53 por agrupamento do registro 50, com ST do cabeçalho rateada
 * pelo valor total de cada grupo (último grupo absorve arredondamento).
 */
export function agruparValoresRegistro53(
	agrupamentos: AgrupamentoRegistro50[],
): ValoresRegistro53[] {
	const porNotaId = new Map<string, AgrupamentoRegistro50[]>();
	for (const agrupamento of agrupamentos) {
		const lista = porNotaId.get(agrupamento.nota.id) ?? [];
		lista.push(agrupamento);
		porNotaId.set(agrupamento.nota.id, lista);
	}

	const resultado: ValoresRegistro53[] = [];

	for (const grupos of porNotaId.values()) {
		const nota = grupos[0]?.nota;
		if (!nota) continue;

		const baseTotal = parseNumero(nota.baseIcmsSt);
		const valorTotalSt = parseNumero(nota.valorIcmsSt);
		if (baseTotal <= 0 && valorTotalSt <= 0) continue;

		const somaValorGrupos = grupos.reduce((s, g) => s + g.valorTotal, 0);
		let baseRestante = baseTotal;
		let valorRestante = valorTotalSt;

		for (let indice = 0; indice < grupos.length; indice++) {
			const grupo = grupos[indice];
			const ultimo = indice === grupos.length - 1;
			let baseSt: number;
			let valorSt: number;

			if (ultimo) {
				baseSt = baseRestante;
				valorSt = valorRestante;
			} else if (somaValorGrupos > 0) {
				const peso = grupo.valorTotal / somaValorGrupos;
				baseSt = arredondarCentavos(baseTotal * peso);
				valorSt = arredondarCentavos(valorTotalSt * peso);
				baseRestante = arredondarCentavos(baseRestante - baseSt);
				valorRestante = arredondarCentavos(valorRestante - valorSt);
			} else {
				baseSt = indice === 0 ? baseTotal : 0;
				valorSt = indice === 0 ? valorTotalSt : 0;
			}

			if (baseSt <= 0 && valorSt <= 0) continue;

			resultado.push({
				agrupamento: grupo,
				baseIcmsSt: baseSt,
				valorIcmsSt: valorSt,
			});
		}
	}

	return resultado;
}

function arredondarCentavos(valor: number): number {
	return Math.round(valor * 100) / 100;
}
