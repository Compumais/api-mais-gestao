import { v4 as uuidv4 } from "uuid";
import type { DavItem, NovoDavItem } from "@/model/dav-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import { criarDavItem } from "@/repositories/dav-item-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpBadRequest, httpCriacao, httpErro, httpProibido } from "@/util/http-util.js";

type CriarDavItemParametros = {
	iddav: string;
	dadosItem: Omit<NovoDavItem, "id" | "iddav">;
	idusuario: string;
};

export async function criarDavItemService({
	iddav,
	dadosItem,
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

	const registro = await criarDavItem({
		id: uuidv4(),
		iddav,
		...dadosItem,
		currenttimemillis: Date.now(),
	});

	if (!registro) {
		return httpErro();
	}

	return httpCriacao(registro);
}
