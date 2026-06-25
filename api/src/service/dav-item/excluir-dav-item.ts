import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import {
	buscarDavItemPorId,
	excluirDavItem,
} from "@/repositories/dav-item-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpBadRequest,
	httpErro,
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirDavItemParametros = {
	iddav: string;
	iditem: string;
	idusuario: string;
};

export async function excluirDavItemService({
	iddav,
	iditem,
	idusuario,
}: ExcluirDavItemParametros): Promise<HttpResponse<null>> {
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

	await excluirDavItem(iditem);
	return httpSemConteudo();
}
