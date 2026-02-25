import type { HttpResponse } from "../../model/http-model.js";
import {
	buscarEmpresaPorId,
	type Empresa,
} from "../../repositories/empresa-repositories.js";
import { httpNaoEncontrado, httpOk } from "../../util/http-util.js";

export async function buscarEmpresaService(
	id: string,
): Promise<HttpResponse<Empresa | null>> {
	const empresa = await buscarEmpresaPorId(id);

	if (!empresa) {
		return httpNaoEncontrado();
	}

	return httpOk<Empresa>(empresa);
}
