import type { Financeiro, NovoFinanceiro } from "@/model/financeiro-model";
import type { HttpResponse } from "@/model/http-model";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories";
import { httpNaoEncontrado, httpOk } from "@/util/http-util";

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
