import type { HttpResponse } from "../../model/http-model.js";
import {
	buscarEmpresaPorId,
	type Empresa,
} from "../../repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "../../repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk } from "../../util/http-util.js";

type BuscarEmpresaParametros = {
	idusuario: string;
	id: string;
};

export async function buscarEmpresaService({
	idusuario,
	id,
}: BuscarEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	const empresa = await buscarEmpresaPorId(id);

	if (!empresa) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		empresa.id,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoEncontrado();
	}

	return httpOk<Empresa>(empresa);
}
