import type { DavItem } from "@/model/dav-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDavPorId } from "@/repositories/dav-repositories.js";
import { listarItensPorDav } from "@/repositories/dav-item-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpBadRequest, httpErro, httpOk, httpProibido } from "@/util/http-util.js";

type ListarDavItensParametros = {
	iddav: string;
	idusuario: string;
};

export async function listarDavItensService({
	iddav,
	idusuario,
}: ListarDavItensParametros): Promise<HttpResponse<DavItem[]>> {
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
	return httpOk(itens);
}
