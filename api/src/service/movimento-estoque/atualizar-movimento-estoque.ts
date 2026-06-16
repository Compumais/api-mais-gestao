import type { HttpResponse } from "@/model/http-model.js";
import type { MovimentoEstoque } from "@/model/movimento-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarMovimentoEstoque,
	buscarMovimentoEstoquePorId,
} from "@/repositories/movimento-estoque-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

type AtualizarMovimentoEstoqueParametros = {
	movimentoEstoqueId: number;
	idusuario: string;
	dados: {
		idempresa?: string | undefined;
		cancelado?: number | null | undefined;
		currenttimemillis?: number | null | undefined;
		custoaquisicao?: string | null | undefined;
		customedio?: string | null | undefined;
		custototal?: string | null | undefined;
		data?: string | null | undefined;
		datahora?: string | null | undefined;
		iditemoriginal?: string | null | undefined;
		idlocalestoque?: string | null | undefined;
		idlote?: string | null | undefined;
		idoriginal?: string | null | undefined;
		idproduto?: string | null | undefined;
		observacao?: string | null | undefined;
		pontoequilibrio?: string | null | undefined;
		precocusto?: string | null | undefined;
		precoultimacompra?: string | null | undefined;
		quantidadeentrada?: string | null | undefined;
		quantidadesaida?: string | null | undefined;
		tipodocumento?: number | null | undefined;
		valortotal?: string | null | undefined;
		variacao?: number | null | undefined;
	};
};

export async function atualizarMovimentoEstoqueService({
	movimentoEstoqueId,
	idusuario,
	dados,
}: AtualizarMovimentoEstoqueParametros): Promise<
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

	const registroAtualizado = await atualizarMovimentoEstoque(
		movimentoEstoqueId,
		dados,
	);

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<MovimentoEstoque>(registroAtualizado);
}

