import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarBancoPorId,
	excluirBanco,
} from "@/repositories/banco-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirBancoParametros = {
	id: string;
	idusuario: string;
};

export async function excluirBancoService({
	id,
	idusuario,
}: ExcluirBancoParametros): Promise<HttpResponse<void>> {
	const banco = await buscarBancoPorId(id);

	if (!banco) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		banco.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const bancoExcluido = await excluirBanco(id);

	if (!bancoExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
