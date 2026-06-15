import type { VendaPdvItem } from "@/model/venda-pdv-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarVendaPdvItemPorId } from "@/repositories/venda-pdv-item-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarVendaPdvItemParametros = {
	vendaPdvItemId: string;
	idusuario: string;
};

export async function buscarVendaPdvItemService({
	vendaPdvItemId,
	idusuario,
}: BuscarVendaPdvItemParametros): Promise<HttpResponse<VendaPdvItem | null>> {
	const registro = await buscarVendaPdvItemPorId(vendaPdvItemId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<VendaPdvItem>(registro);
}
