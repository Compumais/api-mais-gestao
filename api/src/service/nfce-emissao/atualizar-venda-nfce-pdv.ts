import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoVendaPdvItem } from "@/model/venda-pdv-item-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNfceConfiguracaoPorEmpresa } from "@/repositories/nfce-configuracao-repositories.js";
import { atualizarVendaPdvGourmet } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { substituirItensVendaPdv } from "@/repositories/venda-pdv-item-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	emitirNfceVendaPdvService,
	type ResultadoEmissaoNfcePdv,
} from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { resolverVendaPorNotaFiscalNfce } from "@/service/nfce-emissao/resolver-venda-nfce.js";
import { reajustarEstoqueVendaPdv } from "@/service/estoque/reajustar-estoque-venda-pdv.js";
import { avaliarEmissaoNfcePorPagamento } from "@/util/avaliar-emissao-nfce-pagamento.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarMeiosPagamentoNfce } from "@/util/nfce-config-padrao.js";
import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";
import { TIPO_ESTOQUE } from "@/util/tipo-estoque.js";
import type { PagamentosRegistro } from "@/util/pagamentos-pdv-util.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

const STATUS_EDITAVEL_NFCE = new Set<number>([
	NFE_STATUS.PENDENTE,
	NFE_STATUS.REJEITADA,
	NFE_STATUS.DENEGADA,
]);

export type ItemAtualizacaoVendaNfcePdv = {
	idproduto: string;
	quantidade: string;
	precounitario: string;
	nomeproduto?: string;
};

export type AtualizarVendaNfcePdvParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
	itens: ItemAtualizacaoVendaNfcePdv[];
	pagamentos: PagamentosRegistro & {
		desconto?: string | null;
		valortaxaservico?: string | null;
		valorcouverartistico?: string | null;
	};
};

export type ResultadoAtualizacaoVendaNfcePdv = {
	idvenda: string;
	idnotafiscal: string;
	movimentosRegistrados: number;
	emissaoNfce?: ResultadoEmissaoNfcePdv;
	avisos: string[];
};

function calcularSubtotalItens(
	itens: ItemAtualizacaoVendaNfcePdv[],
): number {
	return itens.reduce((acc, item) => {
		const qty = Number.parseFloat(item.quantidade);
		const preco = Number.parseFloat(item.precounitario);
		if (Number.isNaN(qty) || Number.isNaN(preco)) return acc;
		return acc + qty * preco;
	}, 0);
}

function calcularTotalComTaxas(
	subtotal: number,
	desconto: number,
	taxaServico: number,
	couvert: number,
): number {
	return Math.max(0, subtotal - desconto + taxaServico + couvert);
}

function calcularTotalPago(pagamentos: PagamentosRegistro): number {
	return (
		parseValorMonetario(pagamentos.valordinheiro) +
		parseValorMonetario(pagamentos.valorcartaocredito) +
		parseValorMonetario(pagamentos.valorcartaodebito) +
		parseValorMonetario(pagamentos.valorcartao) +
		parseValorMonetario(pagamentos.valorpix) +
		parseValorMonetario(pagamentos.valorprepago)
	);
}

function calcularTroco(valortotal: number, pagamentos: PagamentosRegistro): number {
	return Math.max(0, calcularTotalPago(pagamentos) - valortotal);
}

export async function atualizarVendaNfcePdvService({
	idusuario,
	idempresa,
	idnotafiscal,
	itens,
	pagamentos,
}: AtualizarVendaNfcePdvParametros): Promise<
	HttpResponse<ResultadoAtualizacaoVendaNfcePdv>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (itens.length === 0) {
		return httpBadRequest("Informe pelo menos um item na venda");
	}

	const resolvido = await resolverVendaPorNotaFiscalNfce(idnotafiscal, idempresa);
	if (!resolvido) {
		return httpNaoEncontrado();
	}

	const { nota, venda } = resolvido;

	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("NFC-e autorizada não pode ser alterada");
	}

	if (nota.status == null || !STATUS_EDITAVEL_NFCE.has(nota.status)) {
		return httpBadRequest(
			"Somente NFC-e pendentes, rejeitadas ou denegadas podem ser alteradas",
		);
	}

	const desconto = parseValorMonetario(pagamentos.desconto);
	const taxaServico = parseValorMonetario(pagamentos.valortaxaservico);
	const couvert = parseValorMonetario(pagamentos.valorcouverartistico);
	const subtotal = calcularSubtotalItens(itens);
	const valortotal = calcularTotalComTaxas(
		subtotal,
		desconto,
		taxaServico,
		couvert,
	);
	const pago = calcularTotalPago(pagamentos);

	if (pago < valortotal) {
		return httpBadRequest("Valor pago é menor que o total da venda");
	}

	const valortroco = calcularTroco(valortotal, pagamentos);

	const pagamentosVenda: PagamentosRegistro = {
		valordinheiro: parseValorMonetario(pagamentos.valordinheiro).toFixed(2),
		valorcartaocredito: parseValorMonetario(
			pagamentos.valorcartaocredito,
		).toFixed(2),
		valorcartaodebito: parseValorMonetario(
			pagamentos.valorcartaodebito,
		).toFixed(2),
		valorcartao: parseValorMonetario(pagamentos.valorcartao).toFixed(2),
		valorpix: parseValorMonetario(pagamentos.valorpix).toFixed(2),
		valorprepago: parseValorMonetario(pagamentos.valorprepago).toFixed(2),
		valortroco: valortroco.toFixed(2),
		valortotal: valortotal.toFixed(2),
	};

	const itensPersistencia: NovoVendaPdvItem[] = [];

	for (const item of itens) {
		const qty = Number.parseFloat(item.quantidade);
		const preco = Number.parseFloat(item.precounitario);

		if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(preco) || preco <= 0) {
			return httpBadRequest("Itens com quantidade ou preço inválido");
		}

		const produto = await buscarProdutoPorId(item.idproduto);
		if (!produto || produto.idempresa !== idempresa) {
			return httpBadRequest("Produto não encontrado na empresa");
		}

		itensPersistencia.push({
			id: uuidv4(),
			idempresa,
			idvenda: venda.id,
			idproduto: item.idproduto,
			quantidade: qty.toFixed(3),
			precounitario: preco.toFixed(3),
			precototal: (qty * preco).toFixed(3),
			precopromocao: "0",
			precoalterado: "0",
			taxaservico: 0,
		});
	}

	await substituirItensVendaPdv(venda.id, itensPersistencia);

	await atualizarVendaPdvGourmet(venda.id, {
		valordinheiro: pagamentosVenda.valordinheiro,
		valorcartaocredito: pagamentosVenda.valorcartaocredito,
		valorcartaodebito: pagamentosVenda.valorcartaodebito,
		valorcartao: pagamentosVenda.valorcartao,
		valorpix: pagamentosVenda.valorpix,
		valorprepago: pagamentosVenda.valorprepago,
		valortroco: pagamentosVenda.valortroco,
		valortotal: pagamentosVenda.valortotal,
		deveemitirnfce: true,
		idnotafiscalnfce: idnotafiscal,
	});

	const configNfce = await buscarNfceConfiguracaoPorEmpresa(idempresa);
	const meiosConfig = normalizarMeiosPagamentoNfce(configNfce?.meiospagamentonfce);
	const avaliacao = avaliarEmissaoNfcePorPagamento(pagamentosVenda, meiosConfig);
	const tipoestoque = avaliacao.deveEmitir
		? TIPO_ESTOQUE.AMBOS
		: TIPO_ESTOQUE.OPERACIONAL;

	const avisos: string[] = [];

	const movimentosRegistrados = await reajustarEstoqueVendaPdv({
		idempresa,
		idvenda: venda.id,
		itensNovos: itens.map((item) => ({
			idproduto: item.idproduto,
			quantidade: item.quantidade,
			precounitario: item.precounitario,
			...(item.nomeproduto !== undefined
				? { nomeproduto: item.nomeproduto }
				: {}),
		})),
		tipoestoque,
	}).catch((erro) => {
		console.error("[nfce] Falha ao reajustar estoque da venda:", erro);
		avisos.push("Falha ao reajustar estoque da venda");
		return 0;
	});

	let emissaoNfce: ResultadoEmissaoNfcePdv | undefined;

	if (avaliacao.deveEmitir) {
		const emissao = await emitirNfceVendaPdvService({
			idempresa,
			idusuario,
			idvenda: venda.id,
			pagamentos: pagamentosVenda,
		});

		if (emissao.success && emissao.body) {
			emissaoNfce = emissao.body;
			if (!emissao.body.emitida) {
				const mensagem =
					emissao.body.erro ??
					emissao.body.xMotivo ??
					emissao.body.pendencias?.map((p) => p.mensagem).join("; ") ??
					"Falha na emissão da NFC-e";
				avisos.push(mensagem);
			}
		} else {
			avisos.push("Falha ao comunicar com o serviço de emissão NFC-e");
		}
	}

	return httpOk({
		idvenda: venda.id,
		idnotafiscal,
		movimentosRegistrados,
		avisos,
		...(emissaoNfce ? { emissaoNfce } : {}),
	});
}
