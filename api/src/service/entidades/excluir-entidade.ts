import type { Entidade } from "@/model/entidade-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEntidadePorId,
	excluirEntidade,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirEntidadeParametros = {
	entidadeId: string;
	idusuario: string;
};

export async function excluirEntidadeService({
	entidadeId,
	idusuario,
}: ExcluirEntidadeParametros): Promise<HttpResponse<Entidade | null>> {
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

	const entidadeExcluido = await excluirEntidade(entidadeId);

	if (!entidadeExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
