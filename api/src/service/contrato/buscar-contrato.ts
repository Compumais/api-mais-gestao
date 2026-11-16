import type { Contrato } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContratoPorIdEempresa } from "@/repositories/contrato-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type BuscarContratoParametros = {
	id: string;
	idempresa: string;
	idusuario: string;
};

export async function buscarContratoService({
	id,
	idempresa,
	idusuario,
}: BuscarContratoParametros): Promise<HttpResponse<Contrato>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const registro = await buscarContratoPorIdEempresa(id, idempresa);
	if (!registro) return httpNaoEncontrado();

	return httpOk(registro);
}
