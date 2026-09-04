import type { HttpResponse } from "@/model/http-model.js";
import { buscarCfopPorId } from "@/repositories/cfop-repositories.js";
import { buscarEmpresaFiscalPorEmpresa } from "@/repositories/empresa-fiscal-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarNcmPorId } from "@/repositories/ncm-repositories.js";
import {
	buscarNotaFiscalPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import type { buscarVendaPdvGourmetPorId } from "@/repositories/venda-pdv-gourmet-repositories.js";
import { listarItensPorVendaPdv } from "@/repositories/venda-pdv-item-repositories.js";
import { buscarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/buscar-configuracao-usuario.js";
import { resolverProvedor } from "@/service/ia/provedores.js";
import { resolverVendaPorNotaFiscalNfce } from "@/service/nfce-emissao/resolver-venda-nfce.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";

type BuscarDetalhesNfceParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
};

export type ItemDetalheNfce = {
	nome: string;
	codigo: number | null;
	quantidade: string;
	precounitario: string;
	valortotal: string;
	unidade: string | null;
	ncm: string | null;
	cfop: string | null;
	cst: string | null;
	csosn: string | null;
};

export type PagamentoDetalheNfce = {
	meio: string;
	label: string;
	valor: number;
};

export type RejeicaoDetalheNfce = {
	cStat: string | null;
	xMotivo: string | null;
};

export type DetalhesNfce = {
	nota: {
		idnotafiscal: string;
		idvenda: string | null;
		numeronotafiscal: string | null;
		serie: string | null;
		chavenfe: string | null;
		protocolonfe: string | null;
		status: number | null;
		tipoambientenfe: number | null;
		valortotalnota: string | null;
		emissao: string | null;
		datahoraemissao: string | null;
	};
	itens: ItemDetalheNfce[];
	pagamentos: PagamentoDetalheNfce[];
	troco: number;
	rejeicao: RejeicaoDetalheNfce | null;
	contextoFiscal: {
		crt: number | null;
		uf: string | null;
	};
	iaDisponivel: boolean;
};

function formatarSituacaoTributaria(
	valor: string | number | null | undefined,
): string | null {
	if (valor == null) return null;
	const texto = String(valor).trim().replace(/\D/g, "");
	return texto || null;
}

function formatarValorItem(quantidade: string, precounitario: string): string {
	const qtd = Number.parseFloat(quantidade);
	const preco = Number.parseFloat(precounitario);
	if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return "0.00";
	return (qtd * preco).toFixed(2);
}

async function resolverCodigoCfop(
	ids: Array<string | null | undefined>,
): Promise<string | null> {
	for (const id of ids) {
		if (!id) continue;
		const cfop = await buscarCfopPorId(id);
		const codigo = cfop?.codigo?.replace(/\D/g, "") ?? "";
		if (codigo) return codigo;
	}
	return null;
}

async function resolverNcmProduto(
	produto: NonNullable<Awaited<ReturnType<typeof buscarProdutoPorId>>>,
): Promise<string | null> {
	const ncmDireto = produto.ncm?.replace(/\D/g, "") ?? "";
	if (ncmDireto) return ncmDireto;

	if (produto.idncm) {
		const ncmCadastro = await buscarNcmPorId(produto.idncm);
		const codigo = ncmCadastro?.codigo?.replace(/\D/g, "") ?? "";
		if (codigo) return codigo;
	}

	return null;
}

function montarPagamentos(
	venda: NonNullable<Awaited<ReturnType<typeof buscarVendaPdvGourmetPorId>>>,
): PagamentoDetalheNfce[] {
	const pagamentos: PagamentoDetalheNfce[] = [];
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
	if (
		cartaoLegado > 0 &&
		pagamentos.every((pagamento) => !pagamento.meio.startsWith("cartao"))
	) {
		adicionar("cartao_credito", "Cartão", cartaoLegado);
	}

	adicionar("pix", "PIX", parseValorMonetario(venda.valorpix));
	adicionar("prepago", "Pré-pago", parseValorMonetario(venda.valorprepago));

	return pagamentos;
}

function montarRejeicao(nota: {
	status: number | null;
	mensagemtransmissaonfe: string | null;
	codigostatusprotocolonfe: number | null;
	codigostatustransmissaonfe?: number | null;
}): RejeicaoDetalheNfce | null {
	const xMotivo = nota.mensagemtransmissaonfe?.trim() || null;
	const cStatNumero =
		nota.codigostatusprotocolonfe ?? nota.codigostatustransmissaonfe ?? null;
	const cStat = cStatNumero != null ? String(cStatNumero) : null;
	const statusComRejeicao =
		nota.status === NFE_STATUS.REJEITADA || nota.status === NFE_STATUS.DENEGADA;

	if (!statusComRejeicao && !xMotivo) {
		return null;
	}

	return { cStat, xMotivo };
}

async function montarItensDaVenda(idvenda: string): Promise<ItemDetalheNfce[]> {
	const itensVenda = await listarItensPorVendaPdv(idvenda);
	const itens: ItemDetalheNfce[] = [];

	for (const itemVenda of itensVenda) {
		if (!itemVenda.idproduto) {
			itens.push({
				nome: itemVenda.descricao?.trim() || "Item sem produto",
				codigo: null,
				quantidade: itemVenda.quantidade ?? "0",
				precounitario: itemVenda.precounitario ?? "0",
				valortotal: formatarValorItem(
					itemVenda.quantidade ?? "0",
					itemVenda.precounitario ?? "0",
				),
				unidade: null,
				ncm: null,
				cfop: null,
				cst: null,
				csosn: null,
			});
			continue;
		}

		const produto = await buscarProdutoPorId(itemVenda.idproduto);
		const quantidade = itemVenda.quantidade ?? "0";
		const precounitario = itemVenda.precounitario ?? "0";
		const cfop = produto
			? await resolverCodigoCfop([
					produto.idcfopsaidanfce,
					produto.idcfopsaida,
					produto.idcfopsaidaexterna,
				])
			: null;
		const ncm = produto ? await resolverNcmProduto(produto) : null;

		itens.push({
			nome:
				itemVenda.descricao?.trim() ||
				produto?.nome ||
				produto?.descricao ||
				"Produto",
			codigo: produto?.codigo ?? null,
			quantidade,
			precounitario,
			valortotal: formatarValorItem(quantidade, precounitario),
			unidade: produto?.unidademedida ?? null,
			ncm,
			cfop,
			cst: formatarSituacaoTributaria(produto?.situacaotributaria),
			csosn:
				formatarSituacaoTributaria(produto?.tributacaosn) ??
				formatarSituacaoTributaria(produto?.situacaotributariasn),
		});
	}

	return itens;
}

async function montarItensDaNota(
	idnotafiscal: string,
): Promise<ItemDetalheNfce[]> {
	const itensNota = await listarItensPorNotaFiscal(idnotafiscal);
	return itensNota.map((item) => ({
		nome: item.descricao?.trim() || "Item",
		codigo: null,
		quantidade: item.quantidade ?? "0",
		precounitario: item.precounitario ?? "0",
		valortotal: formatarValorItem(
			item.quantidade ?? "0",
			item.precounitario ?? "0",
		),
		unidade: null,
		ncm: item.ncm?.replace(/\D/g, "") || null,
		cfop: item.cfop?.replace(/\D/g, "") || null,
		cst: formatarSituacaoTributaria(item.situacaotributaria),
		csosn: formatarSituacaoTributaria(item.situacaotributariasn),
	}));
}

export async function usuarioTemChaveIa(
	idusuario: string,
	idempresa: string,
): Promise<boolean> {
	const configuracao = await buscarConfiguracaoUsuarioService({
		idusuario,
		idempresa,
	});

	if (!configuracao.success || !configuracao.body) {
		return false;
	}

	return resolverProvedor(configuracao.body.integracoes) != null;
}

export async function buscarDetalhesNfceService({
	idusuario,
	idempresa,
	idnotafiscal,
}: BuscarDetalhesNfceParametros): Promise<HttpResponse<DetalhesNfce>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const resolvido = await resolverVendaPorNotaFiscalNfce(
		idnotafiscal,
		idempresa,
	);

	const nota = resolvido?.nota ?? (await buscarNotaFiscalPorId(idnotafiscal));
	if (!nota || nota.idempresa !== idempresa) {
		return httpNaoEncontrado("NFC-e não encontrada");
	}

	if (nota.modelo !== "65") {
		return httpBadRequest("Detalhes disponíveis apenas para NFC-e (modelo 65)");
	}

	const venda = resolvido?.venda ?? null;
	const itensVenda = venda ? await montarItensDaVenda(venda.id) : [];
	const itens =
		itensVenda.length > 0 ? itensVenda : await montarItensDaNota(nota.id);

	const empresaFiscal = await buscarEmpresaFiscalPorEmpresa(idempresa);
	const iaDisponivel = await usuarioTemChaveIa(idusuario, idempresa);

	return httpOk({
		nota: {
			idnotafiscal: nota.id,
			idvenda: venda?.id ?? null,
			numeronotafiscal: nota.numeronotafiscal,
			serie: nota.serie,
			chavenfe: nota.chavenfe,
			protocolonfe: nota.protocolonfe,
			status: nota.status,
			tipoambientenfe: nota.tipoambientenfe,
			valortotalnota: nota.valortotalnota,
			emissao: nota.emissao,
			datahoraemissao: nota.datahoraemissao,
		},
		itens,
		pagamentos: venda ? montarPagamentos(venda) : [],
		troco: parseValorMonetario(venda?.valortroco),
		rejeicao: montarRejeicao(nota),
		contextoFiscal: {
			crt: empresaFiscal?.crt ?? null,
			uf: empresaFiscal?.uf ?? null,
		},
		iaDisponivel,
	});
}
