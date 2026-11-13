import type { Financeiro } from "@/model/financeiro-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceiroPorId,
	deletarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirFinanceiroParametros =
	| string
	| {
			id: string;
			idusuario?: string;
	  };

export async function excluirFinanceiroService(
	parametros: ExcluirFinanceiroParametros,
): Promise<HttpResponse<Financeiro | null>> {
	const id = typeof parametros === "string" ? parametros : parametros.id;
	const idusuario =
		typeof parametros === "string" ? undefined : parametros.idusuario;

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

	await deletarFinanceiro(id);

	return httpSemConteudo();
}
