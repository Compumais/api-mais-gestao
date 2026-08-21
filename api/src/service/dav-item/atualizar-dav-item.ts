import type { DavItem, NovoDavItem } from "@/model/dav-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import {
	atualizarDavItem,
	buscarDavItemPorId,
} from "@/repositories/dav-item-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type RastroDavItemInput,
	sincronizarLotesDavItem,
} from "@/service/dav-item/sincronizar-lotes-dav-item.js";
import {
	httpBadRequest,
	httpErro,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarDavItemParametros = {
	iddav: string;
	iditem: string;
	idusuario: string;
	dados: Partial<NovoDavItem>;
	rastros?: RastroDavItemInput[];
};

export async function atualizarDavItemService({
	iddav,
	iditem,
	idusuario,
	dados,
	rastros,
}: AtualizarDavItemParametros): Promise<HttpResponse<DavItem | null>> {
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

	const item = await buscarDavItemPorId(iditem);

	if (!item || item.iddav !== iddav) {
		return httpNaoEncontrado();
	}

	const registro = await atualizarDavItem(iditem, dados);

	if (!registro) {
		return httpErro();
	}

	if (rastros !== undefined) {
		await sincronizarLotesDavItem({
			idempresa: dav.idempresa,
			iddavitem: iditem,
			rastros,
		});
	}

	return httpOk(registro);
}
