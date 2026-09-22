import type { CardapioDelivery } from "@/model/cardapio-delivery-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCardapioDeliveryPorSlug,
	listarGruposGourmetCardapio,
	listarIdsMaisPedidosCardapio,
	listarProdutosCardapioPublico,
} from "@/repositories/cardapio-delivery-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { avaliarHorarioCardapio } from "@/util/avaliar-horario-cardapio.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";
import { numberFromDecimal } from "@/util/totais-cardapio-delivery.js";

export type CardapioPublicoMeio = {
	id: string;
	descricao: string;
	formapagamentonfe: string | null;
};

export type CardapioPublicoGrupo = {
	id: string;
	nome: string;
	imagemurl: string | null;
};

export type CardapioPublicoProduto = {
	id: string;
	descricao: string;
	observacoes: string | null;
	preco: number;
	espizza: number;
	idgrupogourmet: string;
	imagemurl: string | null;
};

export type CardapioPublico = {
	nome: string;
	slug: string;
	corprimaria: string;
	logourl: string | null;
	bannerurl: string | null;
	habilitadelivery: number;
	habilitaretirada: number;
	taxaentregapadrao: number;
	bairrosentrega: CardapioDelivery["bairrosentrega"];
	pedidominimo: number;
	chavepix: string | null;
	tempomedioentrega: string | null;
	mensagemrodape: string | null;
	horario: CardapioDelivery["horario"];
	aberto: boolean;
	mensagemhorario: string;
	camposfinalizacao: CardapioDelivery["camposfinalizacao"];
	meiospagamento: CardapioPublicoMeio[];
	grupos: CardapioPublicoGrupo[];
	produtos: CardapioPublicoProduto[];
	maisPedidos: CardapioPublicoProduto[];
};

function urlPublica(
	slug: string,
	caminho: string,
	tem: boolean,
): string | null {
	return tem ? `/publico/cardapio/${slug}/${caminho}` : null;
}

function mapearProduto(
	slug: string,
	produto: Awaited<ReturnType<typeof listarProdutosCardapioPublico>>[number],
): CardapioPublicoProduto {
	return {
		id: produto.id,
		descricao: produto.descricao,
		observacoes: produto.observacoes,
		preco: numberFromDecimal(produto.preco),
		espizza: Number(produto.espizza) === 1 ? 1 : 0,
		idgrupogourmet: produto.idgrupogourmet,
		imagemurl: urlPublica(
			slug,
			`produtos/${produto.id}/imagem`,
			produto.temimagem,
		),
	};
}

export async function buscarCardapioPublicoService(
	slug: string,
): Promise<HttpResponse<CardapioPublico>> {
	const cardapio = await buscarCardapioDeliveryPorSlug(slug);
	if (!cardapio || cardapio.ativo !== 1) {
		return httpNaoEncontrado("Cardápio indisponível");
	}

	const empresa = await buscarEmpresaPorId(cardapio.idempresa);
	if (!empresa) return httpNaoEncontrado("Cardápio indisponível");

	const horario = avaliarHorarioCardapio(cardapio.horario);
	const [produtos, grupos, ranking] = await Promise.all([
		listarProdutosCardapioPublico(cardapio.idempresa),
		listarGruposGourmetCardapio(cardapio.idempresa),
		listarIdsMaisPedidosCardapio(cardapio.idempresa, 8),
	]);

	const produtosMapeados = produtos.map((produto) =>
		mapearProduto(slug, produto),
	);
	const porId = new Map(
		produtosMapeados.map((produto) => [produto.id, produto]),
	);
	const maisPedidos = ranking
		.map((linha) => porId.get(linha.idproduto))
		.filter((produto): produto is CardapioPublicoProduto => Boolean(produto));

	const idsGruposUsados = new Set(produtos.map((p) => p.idgrupogourmet));
	const gruposVisiveis = grupos
		.filter((grupo) => idsGruposUsados.has(grupo.id))
		.map((grupo) => ({
			id: grupo.id,
			nome: grupo.nome,
			imagemurl: urlPublica(
				slug,
				`grupos/${grupo.id}/imagem`,
				Boolean(grupo.caminhoimagem),
			),
		}));

	const meios: CardapioPublicoMeio[] = [];
	for (const id of cardapio.idmeiospagamento ?? []) {
		const meio = await buscarTipoDocumentoFinanceiroPorId(id);
		if (!meio || meio.idempresa !== cardapio.idempresa) continue;
		if (Number(meio.inativo) === 1) continue;
		meios.push({
			id: meio.id,
			descricao: meio.descricao,
			formapagamentonfe: meio.formapagamentonfe,
		});
	}

	return httpOk<CardapioPublico>({
		nome: empresa.nome,
		slug: cardapio.slug,
		corprimaria: cardapio.corprimaria || "#c2410c",
		logourl: cardapio.logourl,
		bannerurl: cardapio.bannerurl,
		habilitadelivery: cardapio.habilitadelivery,
		habilitaretirada: cardapio.habilitaretirada,
		taxaentregapadrao: numberFromDecimal(cardapio.taxaentregapadrao),
		bairrosentrega: cardapio.bairrosentrega ?? [],
		pedidominimo: numberFromDecimal(cardapio.pedidominimo),
		chavepix: cardapio.chavepix,
		tempomedioentrega: cardapio.tempomedioentrega,
		mensagemrodape: cardapio.mensagemrodape,
		horario: cardapio.horario,
		aberto: horario.aberto,
		mensagemhorario: horario.mensagem,
		camposfinalizacao: cardapio.camposfinalizacao ?? [],
		meiospagamento: meios,
		grupos: gruposVisiveis,
		produtos: produtosMapeados,
		maisPedidos,
	});
}
