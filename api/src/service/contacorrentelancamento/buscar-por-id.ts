import type { HttpResponse } from "@/model/http-model.js";
import type { LancamentoComRelacionamentos } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrenteLancamentoPorId } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

type BuscarContaCorrenteLancamentoParametros = {
	idusuario: string;
	id: string;
};

export async function buscarContaCorrenteLancamentoPorIdService({
	idusuario,
	id,
}: BuscarContaCorrenteLancamentoParametros): Promise<
	HttpResponse<LancamentoComRelacionamentos>
> {
	const contaCorrenteLancamento = await buscarContaCorrenteLancamentoPorId({
		id,
	});

	if (!contaCorrenteLancamento) {
		return httpNaoEncontrado();
	}

	const contaCorrente = await buscarContaCorrentePorId({
		id: contaCorrenteLancamento.idcontacorrente,
	});

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

	return httpOk(contaCorrenteLancamento);
}
