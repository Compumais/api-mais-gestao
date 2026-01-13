import type { Entidade } from "@/model/entidade-model";
import type { HttpResponse } from "@/model/http-model";
import {
	atualizarEntidade,
	buscarEntidadePorId,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util";

type AtualizarEntidadeParametros = {
	entidadeId: string;
	idusuario: string;
	dados: {
		nome?: string | undefined;
		email?: string | null | undefined;
		telefone?: string | null | undefined;
		endereco?: string | null | undefined;
		cidade?: string | null | undefined;
		estado?: string | null | undefined;
		cep?: string | null | undefined;
		pais?: string | null | undefined;
	};
};

export async function atualizarEntidadeService({
	entidadeId,
	idusuario,
	dados,
}: AtualizarEntidadeParametros): Promise<HttpResponse<Entidade | null>> {
	const entidadeExistente = await buscarEntidadePorId(entidadeId);

	if (!entidadeExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		entidadeExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dados.email || dados.telefone) {
		const emailOuTelefoneDuplicado = await verificarEmailTelefoneDuplicado(
			entidadeExistente.idempresa,
			dados.email ?? entidadeExistente.email,
			dados.telefone ?? entidadeExistente.telefone,
			entidadeId,
		);

		if (emailOuTelefoneDuplicado) {
			return httpRecursoExistente();
		}
	}

	const entidadeAtualizado = await atualizarEntidade(entidadeId, {
		...dados,
		atualizadoem: new Date().toISOString(),
	});

	if (!entidadeAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<Entidade>(entidadeAtualizado);
}
