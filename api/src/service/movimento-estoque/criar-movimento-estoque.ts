import type { HttpResponse } from "@/model/http-model.js";
import type {
	MovimentoEstoque,
	NovoMovimentoEstoque,
} from "@/model/movimento-estoque-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErro,
	httpProibido,
} from "@/util/http-util.js";
import { TIPO_DOCUMENTO_ESTOQUE, TIPO_ESTOQUE } from "@/util/tipo-estoque.js";

type CriarMovimentoEstoqueParametros = {
	dadosMovimentoEstoque: NovoMovimentoEstoque;
	idusuario: string;
};

function parseQuantidade(valor: string | null | undefined): number {
	const qtd = Number.parseFloat(valor ?? "0");
	return Number.isNaN(qtd) ? 0 : qtd;
}

export async function criarMovimentoEstoqueService({
	dadosMovimentoEstoque,
	idusuario,
}: CriarMovimentoEstoqueParametros): Promise<
	HttpResponse<MovimentoEstoque | null>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dadosMovimentoEstoque.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (!dadosMovimentoEstoque.idproduto) {
		return httpBadRequest("Produto é obrigatório para movimento de estoque");
	}

	const entrada = parseQuantidade(dadosMovimentoEstoque.quantidadeentrada);
	const saida = parseQuantidade(dadosMovimentoEstoque.quantidadesaida);

	if ((entrada > 0 && saida > 0) || (entrada <= 0 && saida <= 0)) {
		return httpBadRequest(
			"Informe quantidade de entrada ou de saída (apenas um dos lados)",
		);
	}

	const tipoestoque =
		dadosMovimentoEstoque.tipoestoque === TIPO_ESTOQUE.OPERACIONAL ||
		dadosMovimentoEstoque.tipoestoque === TIPO_ESTOQUE.FISCAL ||
		dadosMovimentoEstoque.tipoestoque === TIPO_ESTOQUE.AMBOS
			? dadosMovimentoEstoque.tipoestoque
			: TIPO_ESTOQUE.AMBOS;

	try {
		const registro = await registrarMovimentoEstoque({
			idempresa: dadosMovimentoEstoque.idempresa,
			idproduto: dadosMovimentoEstoque.idproduto,
			quantidade: (entrada > 0 ? entrada : saida).toFixed(6),
			sentido: entrada > 0 ? "entrada" : "saida",
			tipoestoque,
			tipodocumento:
				dadosMovimentoEstoque.tipodocumento ?? TIPO_DOCUMENTO_ESTOQUE.ACERTO,
			idoriginal: dadosMovimentoEstoque.idoriginal,
			iditemoriginal: dadosMovimentoEstoque.iditemoriginal,
			idlocalestoque: dadosMovimentoEstoque.idlocalestoque,
			data: dadosMovimentoEstoque.data ?? undefined,
			datahora: dadosMovimentoEstoque.datahora ?? undefined,
			valortotal: dadosMovimentoEstoque.valortotal,
			custoaquisicao: dadosMovimentoEstoque.custoaquisicao,
			customedio: dadosMovimentoEstoque.customedio,
			custototal: dadosMovimentoEstoque.custototal,
			precocusto: dadosMovimentoEstoque.precocusto,
			precoultimacompra: dadosMovimentoEstoque.precoultimacompra,
			observacao: dadosMovimentoEstoque.observacao,
			idlote: dadosMovimentoEstoque.idlote,
			permitirSemLote: true,
		});

		if (!registro) {
			return httpErro();
		}

		return httpCriacao<MovimentoEstoque>(registro);
	} catch (erro) {
		console.error("[estoque] Falha ao criar movimento via registrador:", erro);
		return httpBadRequest(
			erro instanceof Error ? erro.message : "Falha ao registrar movimento",
		);
	}
}
