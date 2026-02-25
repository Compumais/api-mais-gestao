import type { Financeiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarFinanceiroPorId,
	deletarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import { httpNaoEncontrado, httpSemConteudo } from "@/util/http-util.js";

export async function excluirFinanceiroService(
	id: string,
): Promise<HttpResponse<Financeiro | null>> {
	const financeiroExistente = await buscarFinanceiroPorId(id);

	if (!financeiroExistente) {
		return httpNaoEncontrado();
	}

	await deletarFinanceiro(id);

	return httpSemConteudo();
}
