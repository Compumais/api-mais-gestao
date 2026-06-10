import type { Departamento } from "@/model/departamento-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarDepartamentoPorId } from "@/repositories/departamento-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarDepartamentoParametros = {
	departamentoId: string;
	idusuario: string;
};

export async function buscarDepartamentoService({
	departamentoId,
	idusuario,
}: BuscarDepartamentoParametros): Promise<HttpResponse<Departamento | null>> {
	const registro = await buscarDepartamentoPorId(departamentoId);

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

	return httpOk<Departamento>(registro);
}
