import type { Banco } from "@/model/banco-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarBancoPorId } from "@/repositories/banco-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarBancoPorIdParametros = {
	id: string;
	idusuario: string;
};

export async function buscarBancoPorIdService({
	id,
	idusuario,
}: BuscarBancoPorIdParametros): Promise<HttpResponse<Banco>> {
	const banco = await buscarBancoPorId(id);

	if (!banco) {
		return httpNaoEncontrado();
	}

	if (banco.idempresa === null) {
		return httpOk<Banco>(banco);
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		banco.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<Banco>(banco);
}
