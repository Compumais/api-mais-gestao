import type { HttpResponse } from "@/model/http-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	buscarVendaPdvGourmetPorId,
	buscarVendaPdvGourmetPorNotaFiscalNfce,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { listarItensPorVendaPdv } from "@/repositories/venda-pdv-item-repositories.js";
import { extrairQrCodeNfceXml } from "@/util/extrair-qr-code-nfce-xml.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";

type BuscarDadosCupomNfceParametros = {
	idusuario: string;
	idnotafiscal: string;
};

type PagamentoCupomNfce = {
	meio: string;
	label: string;
	valor: number;
};

type ItemCupomNfce = {
	codigo?: number | null;
	nome: string;
	quantidade: string;
	precounitario: string;
};

export type DadosCupomNfceResposta = {
	vendaId?: string;
	empresaNome: string;
	dataHora: string;
	itens: ItemCupomNfce[];
	subtotal: number;
	desconto: number;
	taxaServico: number;
	couvert: number;
	total: number;
	pagamentos: PagamentoCupomNfce[];
	troco: number;
	nfce: {
		idnotafiscal: string;
		chave: string;
		protocolo?: string;
		ambiente?: number;
		qrCode?: string;
		urlChave?: string;
	};
};

function montarPagamentosCupom(
	venda: NonNullable<Awaited<ReturnType<typeof buscarVendaPdvGourmetPorId>>>,
): PagamentoCupomNfce[] {
	const pagamentos: PagamentoCupomNfce[] = [];
	const troco = parseValorMonetario(venda.valortroco);
	const dinheiroBruto = parseValorMonetario(venda.valordinheiro);
	const dinheiro = Math.max(0, dinheiroBruto - troco);

	const adicionar = (meio: string, label: string, valor: number) => {
		if (valor > 0) pagamentos.push({ meio, label, valor });
	};

	adicionar("dinheiro", "Dinheiro", dinheiro);
	adicionar(
		"cartao_credito",
		"Cartão Crédito",
		parseValorMonetario(venda.valorcartaocredito),
	);
	adicionar(
		"cartao_debito",
		"Cartão Débito",
		parseValorMonetario(venda.valorcartaodebito),
	);

	const cartaoLegado = parseValorMonetario(venda.valorcartao);
	if (cartaoLegado > 0 && pagamentos.every((p) => !p.meio.startsWith("cartao"))) {
		adicionar("cartao_credito", "Cartão", cartaoLegado);
	}

	adicionar("pix", "PIX", parseValorMonetario(venda.valorpix));
	adicionar("prepago", "Pré-pago", parseValorMonetario(venda.valorprepago));

	return pagamentos;
}

export async function buscarDadosCupomNfceService({
	idusuario,
	idnotafiscal,
}: BuscarDadosCupomNfceParametros): Promise<HttpResponse<DadosCupomNfceResposta>> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);
	if (!nota) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.modelo !== "65") {
		return httpBadRequest("Cupom disponível apenas para NFC-e (modelo 65)");
	}

	if (nota.status !== NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("Cupom disponível apenas para NFC-e autorizada");
	}

	if (!nota.chavenfe) {
		return httpBadRequest("NFC-e sem chave de acesso");
	}

	const empresa = await buscarEmpresaPorId(nota.idempresa);
	if (!empresa) {
		return httpNaoEncontrado();
	}

	const venda =
		(await buscarVendaPdvGourmetPorNotaFiscalNfce(idnotafiscal)) ??
		undefined;

	const itensVenda = venda ? await listarItensPorVendaPdv(venda.id) : [];
	const itens: ItemCupomNfce[] = [];

	for (const itemVenda of itensVenda) {
		const produto = await buscarProdutoPorId(itemVenda.idproduto);
		itens.push({
			codigo: produto?.codigo ?? null,
			nome: produto?.nome ?? "Produto",
			quantidade: itemVenda.quantidade,
			precounitario: itemVenda.precounitario,
		});
	}

	const subtotal = itens.reduce((acc, item) => {
		const qtd = Number.parseFloat(item.quantidade);
		const preco = Number.parseFloat(item.precounitario);
		return acc + (Number.isFinite(qtd) && Number.isFinite(preco) ? qtd * preco : 0);
	}, 0);

	const total =
		parseValorMonetario(nota.valortotalnota) ||
		parseValorMonetario(venda?.valortotal) ||
		subtotal;

	const xml = await obterXmlAutorizadoNotaFiscal(idnotafiscal);
	const { qrCode, urlChave } = extrairQrCodeNfceXml(xml);

	const dataHora =
		nota.datahoraemissao ?? nota.emissao ?? nota.datainclusao ?? new Date().toISOString();

	return httpOk({
		...(venda?.id ? { vendaId: venda.id } : {}),
		empresaNome: empresa.nome,
		dataHora,
		itens,
		subtotal: subtotal > 0 ? subtotal : total,
		desconto: 0,
		taxaServico: 0,
		couvert: 0,
		total,
		pagamentos: venda ? montarPagamentosCupom(venda) : [],
		troco: parseValorMonetario(venda?.valortroco),
		nfce: {
			idnotafiscal: nota.id,
			chave: nota.chavenfe,
			...(nota.protocolonfe ? { protocolo: nota.protocolonfe } : {}),
			...(nota.tipoambientenfe != null ? { ambiente: nota.tipoambientenfe } : {}),
			...(qrCode ? { qrCode } : {}),
			...(urlChave ? { urlChave } : {}),
		},
	});
}
