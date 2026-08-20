import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { listarLotesPorProduto } from "@/repositories/lote-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { buscarSaldoEstoquePorCodigoProduto } from "@/repositories/saldo-estoque-repositories.js";
import {
	saldoDisponivelLoteFefo,
	type TipoSaldoLoteFefo,
} from "@/util/tipo-estoque.js";

export type LoteFefoSugerido = {
	idlote: string;
	numero: string;
	quantidade: number;
	datafabricacao: string | null;
	datavalidade: string | null;
	codigoagregacao: string | null;
};

export type ResultadoFefo = {
	lotes: LoteFefoSugerido[];
	quantidadeAtendida: number;
	quantidadeFaltante: number;
	saldoOrfao: number;
};

function parseQtd(valor: string | null | undefined): number {
	return Number.parseFloat(valor ?? "0") || 0;
}

function loteVencido(datavalidade: string | null, hoje: string): boolean {
	if (!datavalidade) return false;
	return datavalidade < hoje;
}

export async function resolverLotesFefo(params: {
	idempresa: string;
	idproduto: string;
	quantidade: number;
	idcfop?: string | null | undefined;
	dataReferencia?: string | undefined;
	/** Padrão operacional; emissão NF-e/NFC-e deve usar ambos. */
	tipoSaldo?: TipoSaldoLoteFefo | undefined;
}): Promise<ResultadoFefo> {
	const hoje = (params.dataReferencia ?? new Date().toISOString()).slice(0, 10);
	const tipoSaldo = params.tipoSaldo ?? "operacional";
	let permitirVencido = false;

	if (params.idcfop) {
		const cfop = await buscarCfopPorId(params.idcfop);
		permitirVencido = cfop?.permitirbaixarlotevencido === 1;
	}

	const lotes = await listarLotesPorProduto(
		params.idempresa,
		params.idproduto,
		{
			somenteComSaldo: true,
			tipoSaldo,
		},
	);

	const disponiveis = lotes.filter((lote) => {
		if (permitirVencido) return true;
		return !loteVencido(lote.datavalidade, hoje);
	});

	let restante = params.quantidade;
	const escolhidos: LoteFefoSugerido[] = [];

	for (const lote of disponiveis) {
		if (restante <= 0) break;
		const saldo = saldoDisponivelLoteFefo(
			lote.quantidade,
			lote.quantidadefiscal,
			tipoSaldo,
		);
		if (saldo <= 0) continue;
		const usar = Math.min(saldo, restante);
		escolhidos.push({
			idlote: lote.id,
			numero: lote.numero,
			quantidade: Number(usar.toFixed(6)),
			datafabricacao: lote.datafabricacao,
			datavalidade: lote.datavalidade,
			codigoagregacao: lote.codigoagregacao,
		});
		restante = Number((restante - usar).toFixed(6));
	}

	const produto = await buscarProdutoPorId(params.idproduto);
	let saldoProduto = 0;
	if (produto?.codigo != null) {
		const saldo = await buscarSaldoEstoquePorCodigoProduto(
			params.idempresa,
			String(produto.codigo),
		);
		if (tipoSaldo === "fiscal") {
			saldoProduto = parseQtd(saldo?.quantidadefiscal);
		} else if (tipoSaldo === "ambos") {
			saldoProduto = Math.min(
				parseQtd(saldo?.quantidade),
				parseQtd(saldo?.quantidadefiscal),
			);
		} else {
			saldoProduto = parseQtd(saldo?.quantidade);
		}
	}

	const somaLotes = lotes.reduce(
		(acc, lote) =>
			acc +
			saldoDisponivelLoteFefo(lote.quantidade, lote.quantidadefiscal, tipoSaldo),
		0,
	);
	const saldoOrfao = Math.max(0, Number((saldoProduto - somaLotes).toFixed(6)));

	return {
		lotes: escolhidos,
		quantidadeAtendida: Number(
			(params.quantidade - Math.max(0, restante)).toFixed(6),
		),
		quantidadeFaltante: Math.max(0, restante),
		saldoOrfao,
	};
}
