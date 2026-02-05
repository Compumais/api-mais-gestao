import type {
	FinanceiroLancamento,
	NovoFinanceiroLancamento,
} from "@/model/financeiro-lancamentos-model";
import type { HttpResponse } from "@/model/http-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import {
	atualizarFinanceiroLancamento,
	buscarFinanceiroLancamentoPorId,
} from "@/repositories/financeiro-lancamento-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";

interface AtualizarFinanceiroLancamentoParametros {
	id: string;
	idusuario: string;
	idempresa: string;
	dados: Partial<NovoFinanceiroLancamento>;
}

export async function atualizarFinanceiroLancamentoService({
	id,
	idusuario,
	idempresa,
	dados,
}: AtualizarFinanceiroLancamentoParametros): Promise<
	HttpResponse<FinanceiroLancamento | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const financeiroLancamento = await buscarFinanceiroLancamentoPorId(id);

	if (!financeiroLancamento) {
		return httpNaoEncontrado();
	}

	const financeiroLancamentoAtualizado = await atualizarFinanceiroLancamento(
		id,
		dados,
	);

	if (!financeiroLancamentoAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<FinanceiroLancamento>(financeiroLancamentoAtualizado);
}
