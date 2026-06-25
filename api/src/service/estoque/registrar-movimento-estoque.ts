import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	atualizarSaldoEstoque,
	buscarSaldoEstoquePorCodigoProduto,
	criarSaldoEstoque,
} from "@/repositories/saldo-estoque-repositories.js";
import type { NovoMovimentoEstoque } from "@/model/movimento-estoque-model.js";
import { criarMovimentoEstoque } from "@/repositories/movimento-estoque-repositories.js";
import { TIPO_ESTOQUE, type TipoEstoque } from "@/util/tipo-estoque.js";

export type SentidoMovimentoEstoque = "entrada" | "saida";

export type RegistrarMovimentoEstoqueParametros = {
	idempresa: string;
	idproduto: string;
	quantidade: string;
	sentido: SentidoMovimentoEstoque;
	tipoestoque: TipoEstoque;
	tipodocumento: number;
	idoriginal?: string | null;
	iditemoriginal?: string | null;
	idlocalestoque?: string | null;
	data?: string;
	datahora?: string;
	valortotal?: string | null;
	custoaquisicao?: string | null;
	customedio?: string | null;
	custototal?: string | null;
	precocusto?: string | null;
	precoultimacompra?: string | null;
	observacao?: string | null;
	idlote?: string | null;
};

function parseQuantidade(valor: string): number {
	const qtd = Number.parseFloat(valor);
	return Number.isNaN(qtd) ? 0 : qtd;
}

function formatarQuantidade(valor: number): string {
	return Math.max(0, valor).toFixed(6);
}

async function resolverOuCriarSaldo(
	idempresa: string,
	idproduto: string,
	dataIso: string,
) {
	const produto = await buscarProdutoPorId(idproduto);
	if (!produto?.codigo) return null;

	const codigo = String(produto.codigo);
	let saldo = await buscarSaldoEstoquePorCodigoProduto(idempresa, codigo);

	if (!saldo) {
		saldo = await criarSaldoEstoque({
			idempresa,
			codigoproduto: codigo,
			nomeproduto: produto.nome ?? null,
			ncm: produto.ncm ?? null,
			unidademedida: produto.unidademedida ?? null,
			quantidade: "0",
			quantidadefiscal: "0",
			ultimaalteracao: dataIso,
			currenttimemillis: Date.now(),
		});
	}

	return saldo;
}

async function aplicarDeltaSaldo(
	idempresa: string,
	idproduto: string,
	delta: number,
	tipoestoque: TipoEstoque,
	dataIso: string,
) {
	if (delta === 0) return;

	const saldo = await resolverOuCriarSaldo(idempresa, idproduto, dataIso);
	if (!saldo) return;

	const atualOperacional = parseQuantidade(saldo.quantidade ?? "0");
	const atualFiscal = parseQuantidade(saldo.quantidadefiscal ?? "0");

	const dadosAtualizacao: {
		quantidade?: string;
		quantidadefiscal?: string;
		ultimaalteracao: string;
		currenttimemillis: number;
	} = {
		ultimaalteracao: dataIso,
		currenttimemillis: Date.now(),
	};

	if (
		tipoestoque === TIPO_ESTOQUE.OPERACIONAL ||
		tipoestoque === TIPO_ESTOQUE.AMBOS
	) {
		dadosAtualizacao.quantidade = formatarQuantidade(atualOperacional + delta);
	}

	if (tipoestoque === TIPO_ESTOQUE.FISCAL || tipoestoque === TIPO_ESTOQUE.AMBOS) {
		dadosAtualizacao.quantidadefiscal = formatarQuantidade(atualFiscal + delta);
	}

	await atualizarSaldoEstoque(saldo.id, dadosAtualizacao);
}

export async function registrarMovimentoEstoque({
	idempresa,
	idproduto,
	quantidade,
	sentido,
	tipoestoque,
	tipodocumento,
	idoriginal,
	iditemoriginal,
	idlocalestoque,
	data,
	datahora,
	valortotal,
	custoaquisicao,
	customedio,
	custototal,
	precocusto,
	precoultimacompra,
	observacao,
	idlote,
}: RegistrarMovimentoEstoqueParametros) {
	const agora = new Date();
	const dataIso = data ?? agora.toISOString().slice(0, 10);
	const dataHoraIso =
		datahora ?? agora.toISOString().replace("T", " ").replace("Z", "");
	const qtd = parseQuantidade(quantidade);
	if (qtd <= 0) return null;

	const isSaida = sentido === "saida";
	const delta = isSaida ? -qtd : qtd;

	const movimentoData: NovoMovimentoEstoque = {
		idempresa,
		idproduto,
		idlocalestoque: idlocalestoque ?? null,
		idoriginal: idoriginal ?? null,
		iditemoriginal: iditemoriginal ?? null,
		idlote: idlote ?? null,
		tipodocumento,
		tipoestoque,
		quantidadeentrada: isSaida ? null : quantidade,
		quantidadesaida: isSaida ? quantidade : null,
		data: dataIso,
		datahora: dataHoraIso,
		valortotal: valortotal ?? null,
		custoaquisicao: custoaquisicao ?? null,
		customedio: customedio ?? null,
		custototal: custototal ?? null,
		precocusto: precocusto ?? null,
		precoultimacompra: precoultimacompra ?? null,
		observacao: observacao ?? null,
		cancelado: 0,
		currenttimemillis: agora.getTime(),
	};

	const movimento = await criarMovimentoEstoque(movimentoData);

	await aplicarDeltaSaldo(idempresa, idproduto, delta, tipoestoque, dataIso);

	return movimento;
}
