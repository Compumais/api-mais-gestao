import type { HttpResponse } from "@/model/http-model.js";
import type { SaldoEstoque } from "@/model/saldo-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarSaldoEstoquePorId,
	excluirSaldoEstoque,
} from "@/repositories/saldo-estoque-repositories.js";
import {
	httpNaoEncontrado,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

type ExcluirSaldoEstoqueParametros = {
	saldoEstoqueId: number;
	idusuario: string;
};

export async function excluirSaldoEstoqueService({
	saldoEstoqueId,
	idusuario,
}: ExcluirSaldoEstoqueParametros): Promise<HttpResponse<SaldoEstoque | null>> {
	const registroExistente = await buscarSaldoEstoquePorId(saldoEstoqueId);

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

	const registroExcluido = await excluirSaldoEstoque(saldoEstoqueId);

	if (!registroExcluido) {
		return httpNaoEncontrado();
	}

	return httpSemConteudo();
}
