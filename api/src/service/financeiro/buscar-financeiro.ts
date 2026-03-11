import type { Financeiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

type BuscarFinanceiroParametros = {
	idusuario: string;
	id: string;
};

export async function buscarFinanceiroService({
	idusuario,
	id,
}: BuscarFinanceiroParametros): Promise<HttpResponse<Financeiro | null>> {
	const financeiro = await buscarFinanceiroPorId(id);

	if (!financeiro) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		financeiro.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpNaoEncontrado();
	}

	return httpOk<Financeiro>(financeiro);
}
