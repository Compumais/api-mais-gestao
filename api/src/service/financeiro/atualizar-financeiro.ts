import type { Financeiro, NovoFinanceiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceiroPorId,
} from "@/repositories/financeiro-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarFinanceiroParametros = {
	id: string;
	dados: Partial<NovoFinanceiro>;
	idusuario?: string;
};

export async function atualizarFinanceiroService({
	id,
	dados,
	idusuario,
}: AtualizarFinanceiroParametros): Promise<HttpResponse<Financeiro | null>> {
	const financeiroExistente = await buscarFinanceiroPorId(id);

	if (!financeiroExistente) {
		return httpNaoEncontrado();
	}

	if (idusuario) {
		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			idusuario,
			financeiroExistente.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return httpProibido();
		}
	}

	const financeiroAtualizado = await atualizarFinanceiro(id, dados);

	if (!financeiroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<Financeiro>(financeiroAtualizado);
}
