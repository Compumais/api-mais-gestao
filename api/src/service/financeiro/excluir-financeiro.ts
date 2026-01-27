import type { Financeiro } from "@/model/financeiro-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarFinanceiroPorId,
	deletarFinanceiro,
} from "@/repositories/financeiro-repositories";
import { httpNaoEncontrado, httpSemConteudo } from "@/util/http-util";

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
