import type { HttpResponse } from "@/model/http-model";
import type { PlanoContas } from "@/model/plano-contas-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import {
	buscarPlanoContasPorId,
	buscarPlanosFilhos,
	excluirPlanoContas,
} from "@/repositories/plano-contas-repositories";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";
import { verificarPermissao } from "@/util/verificar-permissao";

type ExcluirPlanoContasParametros = {
	planoContasId: string;
	userId: string;
	roles: string[] | undefined;
};

export async function excluirPlanoContasService({
	planoContasId,
	userId,
	roles,
}: ExcluirPlanoContasParametros): Promise<HttpResponse<PlanoContas | null>> {
	const temPermissao = verificarPermissao(roles, [
		"proprietario",
		"financeiro",
	]);

	if (!temPermissao) {
		return httpProibido();
	}

	const planoExistente = await buscarPlanoContasPorId(planoContasId);

	if (!planoExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		userId,
		planoExistente.empresaId,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	// Verifica se o plano tem filhos
	const filhos = await buscarPlanosFilhos(planoContasId);

	if (filhos.length > 0) {
		return {
			success: false,
			status: 400,
			error: "Não é possível excluir plano de contas que possui filhos",
			code: "PLANO_CONTAS_COM_FILHOS_ERROR",
		};
	}

	const planoExcluido = await excluirPlanoContas({ id: planoContasId });

	if (!planoExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
