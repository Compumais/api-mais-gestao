import { v4 as uuidv4 } from "uuid";
import type { Lote } from "@/model/lote-model.js";
import { criarNotaFiscalItemLotes } from "@/repositories/nota-fiscal-item-lote-repositories.js";
import { atualizarProduto } from "@/repositories/produtos-repositories.js";
import { upsertLoteCadastro } from "@/service/lote/upsert-lote.js";
import { normalizarDataRastro } from "@/util/rastro-importacao-nf.js";

export type RastroEntradaNf = {
	numeroLote?: string | undefined;
	quantidadeLote?: string | undefined;
	dataFabricacao?: string | undefined;
	dataValidade?: string | undefined;
	codigoAgregacao?: string | undefined;
};

export type LoteEntradaPersistido = {
	idlote: string;
	numero: string;
	quantidade: string;
	datafabricacao: string | null;
	datavalidade: string | null;
	codigoagregacao: string | null;
};

function parseQtd(valor: string | undefined): number {
	return Number.parseFloat(valor ?? "0") || 0;
}

function ratearQuantidadeEstoque(
	rastros: RastroEntradaNf[],
	quantidadeEstoque: number,
): number[] {
	const quantidades = rastros.map((rastro) => parseQtd(rastro.quantidadeLote));
	const soma = quantidades.reduce((acc, valor) => acc + valor, 0);

	if (soma <= 0) {
		const igual = quantidadeEstoque / rastros.length;
		return rastros.map((_, indice) =>
			indice === rastros.length - 1
				? Number((quantidadeEstoque - igual * (rastros.length - 1)).toFixed(6))
				: Number(igual.toFixed(6)),
		);
	}

	return quantidades.map((qtd, indice) => {
		if (indice === rastros.length - 1) {
			const anteriores = quantidades
				.slice(0, -1)
				.reduce((acc, valor) => acc + (valor / soma) * quantidadeEstoque, 0);
			return Number((quantidadeEstoque - anteriores).toFixed(6));
		}
		return Number(((qtd / soma) * quantidadeEstoque).toFixed(6));
	});
}

export async function persistirLotesEntradaItemNf(params: {
	idempresa: string;
	idproduto: string;
	idnotafiscalitem: string;
	quantidadeEstoque: string;
	controlaLote: boolean;
	controlaValidade: boolean;
	rastros: RastroEntradaNf[] | undefined;
}): Promise<LoteEntradaPersistido[]> {
	const rastros = (params.rastros ?? []).filter((rastro) =>
		rastro.numeroLote?.trim(),
	);

	if (rastros.length === 0) {
		return [];
	}

	if (!params.controlaLote) {
		await atualizarProduto(params.idproduto, {
			controlalote: 1,
			...(rastros.some((rastro) => rastro.dataValidade)
				? { controlavalidade: 1 }
				: params.controlaValidade
					? {}
					: {}),
		});
	} else if (
		!params.controlaValidade &&
		rastros.some((rastro) => rastro.dataValidade)
	) {
		await atualizarProduto(params.idproduto, { controlavalidade: 1 });
	}

	const quantidadeEstoque = parseQtd(params.quantidadeEstoque);
	const rateio = ratearQuantidadeEstoque(rastros, quantidadeEstoque);
	const persistidos: LoteEntradaPersistido[] = [];
	const cadastros: Lote[] = [];

	for (const [indice, rastro] of rastros.entries()) {
		const numero = rastro.numeroLote?.trim() ?? "";
		const lote = await upsertLoteCadastro({
			idempresa: params.idempresa,
			idproduto: params.idproduto,
			numero,
			datafabricacao: normalizarDataRastro(rastro.dataFabricacao),
			datavalidade: normalizarDataRastro(rastro.dataValidade),
			codigoagregacao: rastro.codigoAgregacao?.trim() || null,
		});
		cadastros.push(lote);
		persistidos.push({
			idlote: lote.id,
			numero: lote.numero,
			quantidade: Math.max(0, rateio[indice] ?? 0).toFixed(6),
			datafabricacao: lote.datafabricacao,
			datavalidade: lote.datavalidade,
			codigoagregacao: lote.codigoagregacao,
		});
	}

	await criarNotaFiscalItemLotes(
		persistidos.map((item, indice) => ({
			id: uuidv4(),
			idempresa: params.idempresa,
			idnotafiscalitem: params.idnotafiscalitem,
			idlote: item.idlote,
			numero: item.numero,
			quantidade: item.quantidade,
			datafabricacao: cadastros[indice]?.datafabricacao ?? null,
			datavalidade: cadastros[indice]?.datavalidade ?? null,
			codigoagregacao: cadastros[indice]?.codigoagregacao ?? null,
		})),
	);

	return persistidos;
}
