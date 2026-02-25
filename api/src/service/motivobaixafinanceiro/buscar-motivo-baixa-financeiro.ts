import type { HttpResponse } from "@/model/http-model.js";
import type { MotivoBaixaFinanceiro } from "@/model/motivo-baixa-financeiro-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarMotivoBaixaFinanceiroPorId } from "@/repositories/motivo-baixa-financeiro-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

interface BuscarMotivoBaixaFinanceiroParametros {
	id: string;
	idusuario: string;
	idempresa: string;
}

export async function buscarMotivoBaixaFinanceiroService({
	id,
	idusuario,
	idempresa,
}: BuscarMotivoBaixaFinanceiroParametros): Promise<
	HttpResponse<MotivoBaixaFinanceiro>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const motivoBaixaFinanceiro = await buscarMotivoBaixaFinanceiroPorId(id);

	if (!motivoBaixaFinanceiro) {
		return httpNaoEncontrado();
	}

	return httpOk<MotivoBaixaFinanceiro>(motivoBaixaFinanceiro);
}
