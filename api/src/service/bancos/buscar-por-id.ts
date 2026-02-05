import type { Banco } from "@/model/banco-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarBancoPorId } from "@/repositories/banco-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

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

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		banco.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	return httpOk<Banco>(banco);
}
