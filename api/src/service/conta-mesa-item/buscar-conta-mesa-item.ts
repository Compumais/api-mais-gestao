import type { ContaMesaItem } from "@/model/conta-mesa-item-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import { buscarContaMesaItemPorId } from "@/repositories/conta-mesa-item-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarContaMesaItemParametros = {
	contaMesaItemId: string;
	idusuario: string;
};

export async function buscarContaMesaItemService({
	contaMesaItemId,
	idusuario,
}: BuscarContaMesaItemParametros): Promise<HttpResponse<ContaMesaItem | null>> {
	const registro = await buscarContaMesaItemPorId(contaMesaItemId);

	if (!registro) {
		return httpNaoEncontrado();
	}

	const contaMesa = await buscarContaMesaPorId(registro.idcontamesa);

	if (!contaMesa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		contaMesa.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<ContaMesaItem>(registro);
}
