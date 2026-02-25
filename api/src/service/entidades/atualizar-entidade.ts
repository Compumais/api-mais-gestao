import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarEntidade,
	buscarEntidadePorId,
	verificarEmailTelefoneDuplicado,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";

type AtualizarEntidadeParametros = {
	entidadeId: string;
	idusuario: string;
	dados: {
		nome?: string | undefined;
		cnpjcpf?: string | undefined;
		razaosocial?: string | null | undefined;
		tipopessoa?: number | null | undefined;
		inscricaoestadual?: string | null | undefined;
		rg?: string | null | undefined;
		email?: string | null | undefined;
		telefone?: string | null | undefined;
		endereco?: string | null | undefined;
		numeroendereco?: string | null | undefined;
		complemento?: string | null | undefined;
		bairro?: string | null | undefined;
		idcidade?: string | null | undefined;
		idestado?: string | null | undefined;
		cep?: string | null | undefined;
		fax?: string | null | undefined;
		nascimento?: string | null | undefined;
		idplanocontas?: string | null | undefined;
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
