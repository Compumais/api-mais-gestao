import type { HttpResponse } from "@/model/http-model.js";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarPlanoContasPorId,
	buscarPlanosFilhos,
	excluirPlanoContas,
} from "@/repositories/plano-contas-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";

type ExcluirPlanoContasParametros = {
	idplanocontas: string;
	idusuario: string;
	roles: string | string[];
};

export async function excluirPlanoContasService({
	idplanocontas,
	idusuario,
	roles,
}: ExcluirPlanoContasParametros): Promise<HttpResponse<PlanoContas | null>> {
	const temPermissao = verificarPermissao(roles, [
		"proprietario",
		"financeiro",
	]);

	if (!temPermissao) {
		return httpProibido();
	}

	const planoExistente = await buscarPlanoContasPorId(idplanocontas);

	if (!planoExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		planoExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	// Verifica se o plano tem filhos
	const filhos = await buscarPlanosFilhos(idplanocontas);

	if (filhos.length > 0) {
		return {
			success: false,
			status: 400,
			error: "Não é possível excluir plano de contas que possui filhos",
			code: "PLANO_CONTAS_COM_FILHOS_ERROR",
		};
	}

	const planoExcluido = await excluirPlanoContas({ id: idplanocontas });

	if (!planoExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
