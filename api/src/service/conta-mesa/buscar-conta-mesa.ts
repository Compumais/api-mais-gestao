import type { ContaMesa } from "@/model/conta-mesa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContaMesaPorId } from "@/repositories/conta-mesa-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarContaMesaParametros = {
	contaMesaId: string;
	idusuario: string;
};

export async function buscarContaMesaService({
	contaMesaId,
	idusuario,
}: BuscarContaMesaParametros): Promise<HttpResponse<ContaMesa | null>> {
	const registro = await buscarContaMesaPorId(contaMesaId);

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

	return httpOk<ContaMesa>(registro);
}
