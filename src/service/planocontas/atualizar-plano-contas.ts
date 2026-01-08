import type { HttpResponse } from "@/model/http-model";
import type { PlanoContas } from "@/model/plano-contas-model";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/clientes-repositories";
import {
	atualizarPlanoContas,
	buscarPlanoContasPorId,
	type NovoPlanoContas,
} from "@/repositories/plano-contas-repositories";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util";
import { verificarPermissao } from "@/util/verificar-permissao";

type AtualizarPlanoContasParametros = {
	planoContasId: string;
	userId: string;
	roles: string[] | undefined;
	dados: Partial<NovoPlanoContas>;
};

export async function atualizarPlanoContasService({
	planoContasId,
	userId,
	roles,
	dados,
}: AtualizarPlanoContasParametros): Promise<HttpResponse<PlanoContas | null>> {
	const temPermissao = verificarPermissao(roles, ["proprietario", "financeiro"]);

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

	const planoAtualizado = await atualizarPlanoContas(planoContasId, dados);

	if (!planoAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<PlanoContas>(planoAtualizado);
}

