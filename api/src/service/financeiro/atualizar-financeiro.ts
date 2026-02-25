import type { Financeiro, NovoFinanceiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

type AtualizarFinanceiroParametros = {
	id: string;
	dados: Partial<NovoFinanceiro>;
};

export async function atualizarFinanceiroService({
	id,
	dados,
}: AtualizarFinanceiroParametros): Promise<HttpResponse<Financeiro | null>> {
	const financeiroExistente = await buscarFinanceiroPorId(id);

	if (!financeiroExistente) {
		return httpNaoEncontrado();
	}

	const financeiroAtualizado = await atualizarFinanceiro(id, dados);

	if (!financeiroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<Financeiro>(financeiroAtualizado);
}
