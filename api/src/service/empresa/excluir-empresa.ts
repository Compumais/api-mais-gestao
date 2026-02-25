import type { HttpResponse } from "../../model/http-model.js";
import {
	buscarEmpresaPorId,
	type Empresa,
	excluirEmpresa,
	verificarDadosAssociados,
} from "../../repositories/empresa-repositories.js";
import { httpNaoEncontrado, httpSemConteudo } from "../../util/http-util.js";

export async function excluirEmpresaService(
	id: string,
): Promise<HttpResponse<Empresa | null>> {
	const empresaExistente = await buscarEmpresaPorId(id);

	if (!empresaExistente) {
		return httpNaoEncontrado();
	}

	const temDadosAssociados = await verificarDadosAssociados(id);

	if (temDadosAssociados) {
		return {
			success: false,
			status: 409,
			error:
				"Não é possível excluir uma empresa com dados associados (usuários, entidades, contas ou lançamentos)",
			code: "CONFLICT_ERROR",
		};
	}

	const empresaExcluida = await excluirEmpresa(id);

	if (!empresaExcluida) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
