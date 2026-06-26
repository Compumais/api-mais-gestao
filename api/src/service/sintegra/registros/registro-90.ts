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
	totalGeral: number;
};

export function montarRegistros90({
	cnpj,
	inscricaoEstadual,
	contadores,
	totalGeral,
}: MontarRegistros90Parametros): string[] {
	const tiposOrdenados = [...contadores.entries()]
		.filter(([tipo]) => tipo !== "10" && tipo !== "11" && tipo !== "90")
		.sort(([a], [b]) => a.localeCompare(b));

	const pares: Array<{ tipo: string; quantidade: number }> = tiposOrdenados.map(
		([tipo, quantidade]) => ({ tipo, quantidade }),
	);
	pares.push({ tipo: "99", quantidade: totalGeral });

	const paresPorLinha = 5;
	const linhas: string[] = [];

	for (let indice = 0; indice < pares.length; indice += paresPorLinha) {
		const lote = pares.slice(indice, indice + paresPorLinha);
		const ultimaLinha = indice + paresPorLinha >= pares.length;
		let conteudo = [
			"90",
			formatarCnpjCpf(cnpj),
			formatarInscricaoEstadual(inscricaoEstadual),
		].join("");

		for (const par of lote) {
			conteudo += formatarNumerico(par.tipo, 2) + formatarNumerico(par.quantidade, 8);
		}

		conteudo = conteudo.padEnd(125, " ");
		conteudo += ultimaLinha ? String(linhas.length + 1) : " ";
		linhas.push(montarLinha([conteudo.slice(0, 126)]));
	}

	if (linhas.length === 0) {
		const conteudo =
			[
				"90",
				formatarCnpjCpf(cnpj),
				formatarInscricaoEstadual(inscricaoEstadual),
				formatarNumerico("99", 2),
				formatarNumerico(totalGeral, 8),
			].join("").padEnd(125, " ") + "1";
		linhas.push(montarLinha([conteudo]));
	}

	const totalRegistros90 = linhas.length;
	return linhas.map((linha, indice) => {
		if (indice === totalRegistros90 - 1) {
			return montarLinha([linha.slice(0, 125) + String(totalRegistros90)]);
		}
		return linha;
	});
}
