import { v4 as uuidv4 } from "uuid";
import { substituirLotesItemNota } from "@/repositories/nota-fiscal-item-lote-repositories.js";
import type { RastroItemNfe } from "@/util/validar-lotes-item-emissao-nfe.js";
import { upsertLoteCadastro } from "./upsert-lote.js";

export async function persistirLotesItensNotaEmissao(params: {
	idempresa: string;
	itens: Array<{
		iditem: string;
		idproduto?: string | null | undefined;
		rastros?: RastroItemNfe[] | undefined;
	}>;
}) {
	for (const item of params.itens) {
		const rastros = item.rastros ?? [];
		if (!item.idproduto || rastros.length === 0) {
			await substituirLotesItemNota(item.iditem, params.idempresa, []);
			continue;
		}

		const registros = [];
		for (const rastro of rastros) {
			const lote = await upsertLoteCadastro({
				idempresa: params.idempresa,
				idproduto: item.idproduto,
				numero: rastro.nLote,
				idlote: rastro.idlote,
				datafabricacao: rastro.dFab ?? null,
				datavalidade: rastro.dVal ?? null,
				codigoagregacao: rastro.cAgreg ?? null,
			});
			registros.push({
				id: uuidv4(),
				idempresa: params.idempresa,
				idnotafiscalitem: item.iditem,
				idlote: lote.id,
				numero: lote.numero,
				quantidade: rastro.qLote.toFixed(6),
				datafabricacao: rastro.dFab ?? lote.datafabricacao ?? null,
				datavalidade: rastro.dVal ?? lote.datavalidade ?? null,
				codigoagregacao: rastro.cAgreg ?? lote.codigoagregacao ?? null,
			});
		}

		await substituirLotesItemNota(item.iditem, params.idempresa, registros);
	}
}
