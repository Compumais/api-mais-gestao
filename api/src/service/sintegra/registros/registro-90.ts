import {
	formatarCnpjCpf,
	formatarInscricaoEstadual,
	formatarNumerico,
	montarLinha,
} from "../formatador-campo.js";

type MontarRegistros90Parametros = {
	cnpj: string;
	inscricaoEstadual: string;
	contadores: Map<string, number>;
	/** Quantidade de registros já montados, sem as linhas do tipo 90. */
	totalSemRegistros90: number;
};

export function montarRegistros90({
	cnpj,
	inscricaoEstadual,
	contadores,
	totalSemRegistros90,
}: MontarRegistros90Parametros): string[] {
	const tiposOrdenados = [...contadores.entries()]
		.filter(([tipo]) => tipo !== "10" && tipo !== "11" && tipo !== "90")
		.sort(([a], [b]) => a.localeCompare(b));

	const pares: Array<{ tipo: string; quantidade: number }> = tiposOrdenados.map(
		([tipo, quantidade]) => ({ tipo, quantidade }),
	);
	const paresPorLinha = 5;
	const quantidadeLinhas90 = Math.max(
		1,
		Math.ceil((pares.length + 1) / paresPorLinha),
	);
	const totalGeral = totalSemRegistros90 + quantidadeLinhas90;
	pares.push({ tipo: "99", quantidade: totalGeral });

	const linhas: string[] = [];

	for (let indice = 0; indice < pares.length; indice += paresPorLinha) {
		const lote = pares.slice(indice, indice + paresPorLinha);
		let conteudo = [
			"90",
			formatarCnpjCpf(cnpj),
			formatarInscricaoEstadual(inscricaoEstadual),
		].join("");

		for (const par of lote) {
			conteudo +=
				formatarNumerico(par.tipo, 2) + formatarNumerico(par.quantidade, 8);
		}

		conteudo = conteudo.padEnd(125, " ");
		conteudo += String(quantidadeLinhas90);
		linhas.push(montarLinha([conteudo.slice(0, 126)]));
	}

	return linhas;
}
