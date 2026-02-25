import type { HttpResponse } from "@/model/http-model.js";
import type { PlanoContas } from "@/model/plano-contas-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarPlanoContas,
	buscarPlanoContasPorId,
	type NovoPlanoContas,
} from "@/repositories/plano-contas-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import { verificarPermissao } from "@/util/verificar-permissao.js";

type AtualizarPlanoContasParametros = {
	idplanocontas: string;
	idusuario: string;
	roles: string | string[];
	dados: Partial<NovoPlanoContas>;
};

export async function atualizarPlanoContasService({
	idplanocontas,
	idusuario,
	roles,
	dados,
}: AtualizarPlanoContasParametros): Promise<HttpResponse<PlanoContas | null>> {
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

	const planoAtualizado = await atualizarPlanoContas(idplanocontas, dados);

	if (!planoAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<PlanoContas>(planoAtualizado);
}
