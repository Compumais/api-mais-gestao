import { v4 as uuidv4 } from "uuid";
import {
	criarDavItemLote,
	excluirLotesPorDavItem,
} from "@/repositories/dav-item-lote-repositories.js";
import { atualizarDavItem } from "@/repositories/dav-item-repositories.js";

export type RastroDavItemInput = {
	idlote?: string | null;
	nLote: string;
	qLote: string | number;
	dFab?: string | null;
	dVal?: string | null;
	cAgreg?: string | null;
};

export async function sincronizarLotesDavItem(params: {
	idempresa: string;
	iddavitem: string;
	rastros: RastroDavItemInput[];
}) {
	await excluirLotesPorDavItem(params.iddavitem);

	const rastrosValidos = params.rastros.filter(
		(rastro) => rastro.nLote.trim() && Number(rastro.qLote) > 0,
	);

	for (const rastro of rastrosValidos) {
		await criarDavItemLote({
			id: uuidv4(),
			idempresa: params.idempresa,
			iddavitem: params.iddavitem,
			idlote: rastro.idlote?.trim() || null,
			numero: rastro.nLote.trim().slice(0, 20),
			quantidade: String(rastro.qLote),
			datafabricacao: rastro.dFab?.trim() || null,
			datavalidade: rastro.dVal?.trim() || null,
			codigoagregacao: rastro.cAgreg?.trim() || null,
		});
	}

	const primeiro = rastrosValidos[0];
	await atualizarDavItem(params.iddavitem, {
		idlote: primeiro?.idlote?.trim() || null,
	});
}
