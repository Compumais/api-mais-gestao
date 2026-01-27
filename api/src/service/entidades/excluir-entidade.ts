import type { Entidade } from "@/model/entidade-model";
import type { HttpResponse } from "@/model/http-model";
import {
	buscarEntidadePorId,
	excluirEntidade,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util";

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
