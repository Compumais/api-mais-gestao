import type { DavItem } from "@/model/dav-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import { listarLotesPorDavItens } from "@/repositories/dav-item-lote-repositories.js";
import { listarItensPorDav } from "@/repositories/dav-item-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

export type DavItemComRastros = DavItem & {
	rastros: Array<{
		idlote?: string;
		nLote: string;
		qLote: number;
		dFab?: string;
		dVal?: string;
		cAgreg?: string;
	}>;
};

type ListarDavItensParametros = {
	iddav: string;
	idusuario: string;
};

export async function listarDavItensService({
	iddav,
	idusuario,
}: ListarDavItensParametros): Promise<HttpResponse<DavItemComRastros[]>> {
	const dav = await buscarDavPorId(iddav);

	if (!dav) {
		return httpBadRequest("Pedido não encontrado");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dav.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const itens = await listarItensPorDav(iddav);
	const lotes = await listarLotesPorDavItens(itens.map((item) => item.id));
	const lotesPorItem = new Map<string, typeof lotes>();
	for (const lote of lotes) {
		const atuais = lotesPorItem.get(lote.iddavitem) ?? [];
		atuais.push(lote);
		lotesPorItem.set(lote.iddavitem, atuais);
	}

	const comRastros: DavItemComRastros[] = itens.map((item) => ({
		...item,
		rastros: (lotesPorItem.get(item.id) ?? []).map((lote) => ({
			...(lote.idlote ? { idlote: lote.idlote } : {}),
			nLote: lote.numero,
			qLote: Number.parseFloat(lote.quantidade ?? "0") || 0,
			...(lote.datafabricacao ? { dFab: lote.datafabricacao } : {}),
			...(lote.datavalidade ? { dVal: lote.datavalidade } : {}),
			...(lote.codigoagregacao ? { cAgreg: lote.codigoagregacao } : {}),
		})),
	}));

	return httpOk(comRastros);
}
