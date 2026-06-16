import type { HttpResponse } from "@/model/http-model.js";
import type { SaldoEstoque } from "@/model/saldo-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarSaldoEstoque,
	buscarSaldoEstoquePorId,
} from "@/repositories/saldo-estoque-repositories.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarSaldoEstoqueParametros = {
	saldoEstoqueId: number;
	idusuario: string;
	dados: {
		cest?: string | null | undefined;
		cnpjfilial?: string | null | undefined;
		codigoproduto?: string | null | undefined;
		currenttimemillis?: number | null | undefined;
		hash?: number | null | undefined;
		idfilial?: number | null | undefined;
		idproduto?: number | null | undefined;
		ncm?: string | null | undefined;
		nomeproduto?: string | null | undefined;
		quantidade?: string | null | undefined;
		ultimaalteracao?: string | null | undefined;
		unidademedida?: string | null | undefined;
		variacao?: number | null | undefined;
	};
};

export async function atualizarSaldoEstoqueService({
	saldoEstoqueId,
	idusuario,
	dados,
}: AtualizarSaldoEstoqueParametros): Promise<HttpResponse<SaldoEstoque | null>> {
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

	const registroAtualizado = await atualizarSaldoEstoque(saldoEstoqueId, dados);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<SaldoEstoque>(registroAtualizado);
}
