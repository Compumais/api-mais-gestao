import type { ContaCorrenteLancamento } from "@/model/conta-corrente-lancamento-model";
import type { HttpResponse } from "@/model/http-model";
import { buscarContaCorrenteLancamentoPorId } from "@/repositories/conta-corrente-lancamento-repositories";
import { httpNaoEncontrado, httpOk } from "@/util/http-util";

export async function buscarContaCorrenteLancamentoPorIdService(
	id: string,
): Promise<HttpResponse<ContaCorrenteLancamento>> {
	const contaCorrenteLancamento = await buscarContaCorrenteLancamentoPorId({
		id,
	});

	if (!contaCorrenteLancamento) {
		return httpNaoEncontrado();
	}

	return httpOk(contaCorrenteLancamento);
}
