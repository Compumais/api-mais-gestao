import type { DadosImportacaoItem } from "@/model/nota-fiscal-importacao-model.js";
import { buscarProximoCodigoProduto } from "@/repositories/proximo-codigo-repositories.js";

type ItemComDadosImportacao = {
	id: string;
	dadosimportacao?: unknown;
};

export function codigoProdutoValido(
	valor: number | undefined | null,
): valor is number {
	return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

export function listarCodigosProdutoReservados(
	itens: ItemComDadosImportacao[],
	idItemIgnorado?: string,
): number[] {
	const reservados: number[] = [];

	for (const item of itens) {
		if (item.id === idItemIgnorado) continue;

		const dados = item.dadosimportacao as
			| DadosImportacaoItem
			| null
			| undefined;
		if (dados?.statusVinculo !== "novo") continue;

		if (codigoProdutoValido(dados.codigoProduto)) {
			reservados.push(dados.codigoProduto);
		}
	}

	return reservados;
}

export function calcularProximoCodigoProduto(
	proximoDoBanco: number,
	codigosReservados: number[],
): number {
	const doBanco = Number.isFinite(proximoDoBanco) ? Number(proximoDoBanco) : 1;
	const maxReservado = codigosReservados.reduce(
		(max, codigo) => (codigo > max ? codigo : max),
		0,
	);

	return Math.max(doBanco, maxReservado + 1);
}

export async function buscarProximoCodigoProdutoImportacao(
	idempresa: string,
	codigosReservados: number[] = [],
): Promise<number> {
	const proximoDoBanco = await buscarProximoCodigoProduto(idempresa);
	return calcularProximoCodigoProduto(
		Number(proximoDoBanco),
		codigosReservados,
	);
}
