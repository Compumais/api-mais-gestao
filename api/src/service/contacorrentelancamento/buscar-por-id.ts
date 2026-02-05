import type { HttpResponse } from "@/model/http-model";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories";
import { buscarContaCorrenteLancamentoPorId } from "@/repositories/conta-corrente-lancamento-repositories";
import { httpNaoEncontrado, httpOk } from "@/util/http-util";

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
