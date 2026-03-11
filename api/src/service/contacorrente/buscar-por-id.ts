import type { ContaCorrente } from "@/model/conta-corrente-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function buscarContaCorrentePorIdService({
	idusuario,
	id,
}: {
	idusuario: string;
	id: string;
}): Promise<HttpResponse<ContaCorrente>> {
	const contaCorrente = await buscarContaCorrentePorId({ id });

	if (!contaCorrente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		contaCorrente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoEncontrado();
	}

	return httpOk<ContaCorrente>(contaCorrente);
}
