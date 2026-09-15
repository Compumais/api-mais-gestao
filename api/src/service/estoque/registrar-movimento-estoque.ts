import type { NovoMovimentoEstoque } from "@/model/movimento-estoque-model.js";
import {
	aplicarDeltaSaldoLote,
	buscarLotePorId,
} from "@/repositories/lote-repositories.js";
import { criarMovimentoEstoque } from "@/repositories/movimento-estoque-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	atualizarSaldoEstoque,
	buscarSaldoEstoquePorCodigoProduto,
	criarSaldoEstoque,
} from "@/repositories/saldo-estoque-repositories.js";
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
	permitirSemLote?: boolean | undefined;
};

function parseQuantidade(valor: string): number {
	const qtd = Number.parseFloat(valor);
	return Number.isNaN(qtd) ? 0 : qtd;
}

function formatarQuantidade(valor: number): string {
	// Vendas/ajustes podem deixar o saldo negativo — não clampamos em zero.
	return valor.toFixed(6);
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

async function aplicarDeltaSaldoDoLote(params: {
	idlote: string;
	idproduto: string;
	delta: number;
	tipoestoque: TipoEstoque;
}) {
	const registro = await buscarLotePorId(params.idlote);
	if (!registro) {
		throw new Error("Lote não encontrado");
	}
	if (registro.idproduto !== params.idproduto) {
		throw new Error("Lote não pertence ao produto do movimento");
	}

	const aplicaOperacional =
		params.tipoestoque === TIPO_ESTOQUE.OPERACIONAL ||
		params.tipoestoque === TIPO_ESTOQUE.AMBOS;
	const aplicaFiscal =
		params.tipoestoque === TIPO_ESTOQUE.FISCAL ||
		params.tipoestoque === TIPO_ESTOQUE.AMBOS;

	const operacional = parseQuantidade(registro.quantidade);
	const fiscal = parseQuantidade(registro.quantidadefiscal);

	if (aplicaOperacional && operacional + params.delta < -0.000001) {
		throw new Error(
			`Saldo do lote ${registro.numero} insuficiente para a saída`,
		);
	}
	if (aplicaFiscal && fiscal + params.delta < -0.000001) {
		throw new Error(
			`Saldo fiscal do lote ${registro.numero} insuficiente para a saída`,
		);
	}

	await aplicarDeltaSaldoLote(
		params.idlote,
		aplicaOperacional ? params.delta : 0,
		aplicaFiscal ? params.delta : 0,
	);
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
	permitirSemLote = false,
}: RegistrarMovimentoEstoqueParametros) {
	const agora = new Date();
	const dataIso = data ?? agora.toISOString().slice(0, 10);
	const dataHoraIso =
		datahora ?? agora.toISOString().replace("T", " ").replace("Z", "");
	const qtd = parseQuantidade(quantidade);
	if (qtd <= 0) return null;

	const produto = await buscarProdutoPorId(idproduto);
	if (produto?.controlalote === 1 && !idlote && !permitirSemLote) {
		throw new Error(
			`Produto ${produto.nome} controla lote. Informe o lote do movimento.`,
		);
	}

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

	if (idlote) {
		await aplicarDeltaSaldoDoLote({
			idlote,
			idproduto,
			delta,
			tipoestoque,
		});
	}

	const movimento = await criarMovimentoEstoque(movimentoData);

	await aplicarDeltaSaldo(idempresa, idproduto, delta, tipoestoque, dataIso);

	return movimento;
}
