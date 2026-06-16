import type { HttpResponse } from "@/model/http-model.js";
import type { LocalEstoque } from "@/model/local-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarLocalEstoquePorId,
	excluirLocalEstoque,
} from "@/repositories/local-estoque-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirLocalEstoqueParametros = {
	localEstoqueId: string;
	idusuario: string;
};

export async function excluirLocalEstoqueService({
	localEstoqueId,
	idusuario,
}: ExcluirLocalEstoqueParametros): Promise<HttpResponse<LocalEstoque | null>> {
	const registroExistente = await buscarLocalEstoquePorId(localEstoqueId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const registroExcluido = await excluirLocalEstoque(localEstoqueId);

	if (!registroExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
