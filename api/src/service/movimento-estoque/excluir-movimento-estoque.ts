import type { HttpResponse } from "@/model/http-model.js";
import type { MovimentoEstoque } from "@/model/movimento-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarMovimentoEstoquePorId,
	excluirMovimentoEstoque,
} from "@/repositories/movimento-estoque-repositories.js";
import { httpNaoEncontrado, httpProibido, httpSemConteudo } from "@/util/http-util.js";

type ExcluirMovimentoEstoqueParametros = {
	movimentoEstoqueId: number;
	idusuario: string;
};

export async function excluirMovimentoEstoqueService({
	movimentoEstoqueId,
	idusuario,
}: ExcluirMovimentoEstoqueParametros): Promise<
	HttpResponse<MovimentoEstoque | null>
> {
	const registroExistente = await buscarMovimentoEstoquePorId(movimentoEstoqueId);

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

	const registroExcluido = await excluirMovimentoEstoque(movimentoEstoqueId);

	if (!registroExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}

