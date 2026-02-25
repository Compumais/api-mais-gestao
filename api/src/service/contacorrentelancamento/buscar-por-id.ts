import type { HttpResponse } from "@/model/http-model.js";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrenteLancamentoPorId } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

export async function buscarContaCorrenteLancamentoPorIdService(
	id: string,
): Promise<HttpResponse<LancamentoComRelacionamentos>> {
	const contaCorrenteLancamento = await buscarContaCorrenteLancamentoPorId({
		id,
	});

	if (!contaCorrenteLancamento) {
		return httpNaoEncontrado();
	}

	return httpOk(contaCorrenteLancamento);
}
