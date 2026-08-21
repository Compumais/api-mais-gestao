import { v4 as uuidv4 } from "uuid";
import type { DavItem, NovoDavItem } from "@/model/dav-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import { criarDavItem } from "@/repositories/dav-item-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type RastroDavItemInput,
	sincronizarLotesDavItem,
} from "@/service/dav-item/sincronizar-lotes-dav-item.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpProibido,
} from "@/util/http-util.js";

type CriarDavItemParametros = {
	iddav: string;
	dadosItem: Omit<NovoDavItem, "id" | "iddav">;
	rastros?: RastroDavItemInput[];
	idusuario: string;
};

export async function criarDavItemService({
	iddav,
	dadosItem,
	rastros,
	idusuario,
}: CriarDavItemParametros): Promise<HttpResponse<DavItem | null>> {
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

	const id = uuidv4();
	const registro = await criarDavItem({
		id,
		iddav,
		...dadosItem,
		currenttimemillis: Date.now(),
	});

	if (!registro) {
		return httpErro();
	}

	if (rastros && rastros.length > 0) {
		await sincronizarLotesDavItem({
			idempresa: dav.idempresa,
			iddavitem: id,
			rastros,
		});
	}

	return httpCriacao(registro);
}
