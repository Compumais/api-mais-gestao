import { v4 as uuidv4 } from "uuid";
import type {
	ItemPedidoCardapio,
	PedidoCardapioDelivery,
	RespostaCampoCardapio,
} from "@/model/cardapio-delivery-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCardapioDeliveryPorSlug,
	buscarPedidoCardapioPorClientOrderId,
	buscarProdutosCardapioPorIds,
	criarPedidoCardapioDelivery,
	protocoloCardapioExiste,
} from "@/repositories/cardapio-delivery-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { avaliarHorarioCardapio } from "@/util/avaliar-horario-cardapio.js";
import { gerarProtocoloCardapio } from "@/util/cardapio-delivery-identidade.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";
import {
	arredondarDinheiro,
	campoFinalizacaoVisivel,
	montarPixCopiaCola,
	numberFromDecimal,
	precoPizzaMeioAMeio,
	resolverTaxaEntrega,
} from "@/util/totais-cardapio-delivery.js";

export type ItemPedidoCardapioEntrada = {
	idproduto: string;
	quantidade: number;
	observacao?: string | null;
	idprodutomeio?: string | null;
};

export type CriarPedidoCardapioPublicoParametros = {
	slug: string;
	clientorderid: string;
	nomecliente: string;
	telefone: string;
	respostas: RespostaCampoCardapio[];
	itens: ItemPedidoCardapioEntrada[];
};

export type PedidoCardapioPublicoCriado = {
	id: string;
	protocolo: string;
	status: string;
	total: number;
	subtotal: number;
	valorentrega: number;
	modalidade: string;
	pixCopiaCola: string | null;
	chavepix: string | null;
};

function respostasMapa(
	respostas: RespostaCampoCardapio[],
): Record<string, string> {
	const mapa: Record<string, string> = {};
	for (const resposta of respostas) {
		mapa[resposta.campoid] = String(resposta.valor ?? "").trim();
	}
	return mapa;
}

function valorCampo(
	mapa: Record<string, string>,
	tipo: string,
	campos: Array<{ id: string; tipo: string }>,
): string {
	const campo = campos.find((item) => item.tipo === tipo);
	if (!campo) return "";
	return mapa[campo.id] ?? "";
}

async function gerarProtocoloUnico(): Promise<string> {
	for (let i = 0; i < 12; i += 1) {
		const protocolo = gerarProtocoloCardapio();
		if (!(await protocoloCardapioExiste(protocolo))) return protocolo;
	}
	return uuidv4().replace(/-/g, "").slice(0, 12).toUpperCase();
}

export async function criarPedidoCardapioPublicoService(
	params: CriarPedidoCardapioPublicoParametros,
): Promise<HttpResponse<PedidoCardapioPublicoCriado>> {
	const cardapio = await buscarCardapioDeliveryPorSlug(params.slug);
	if (!cardapio || cardapio.ativo !== 1) {
		return httpNaoEncontrado("Cardápio indisponível");
	}

	const clientorderid = params.clientorderid.trim();
	if (!clientorderid) {
		return httpBadRequest("Identificador do pedido é obrigatório");
	}

	const existente = await buscarPedidoCardapioPorClientOrderId(
		cardapio.idempresa,
		clientorderid,
	);
	if (existente) {
		return httpOk(mapearPedidoCriado(existente, cardapio.chavepix));
	}

	const horario = avaliarHorarioCardapio(cardapio.horario);
	if (!horario.aberto) {
		return httpBadRequest(horario.mensagem);
	}

	const nomecliente = params.nomecliente.trim();
	const telefone = params.telefone.replace(/\D/g, "");
	if (nomecliente.length < 2) {
		return httpBadRequest("Informe seu nome");
	}
	if (telefone.length < 10) {
		return httpBadRequest("Informe um telefone com DDD");
	}

	if (!params.itens.length) {
		return httpBadRequest("Pedido sem itens");
	}

	const mapa = respostasMapa(params.respostas);
	const campos = [...(cardapio.camposfinalizacao ?? [])].sort(
		(a, b) => a.ordem - b.ordem,
	);

	for (const campo of campos) {
		if (
			!campoFinalizacaoVisivel(campo.condicao, mapa) ||
			Number(campo.obrigatorio) !== 1
		) {
			continue;
		}
		if (campo.tipo === "endereco") {
			const endereco = mapa.endereco ?? mapa[`${campo.id}.endereco`] ?? "";
			const numero = mapa.numero ?? mapa[`${campo.id}.numero`] ?? "";
			const bairro = mapa.bairro ?? mapa[`${campo.id}.bairro`] ?? "";
			if (!endereco.trim() || !numero.trim() || !bairro.trim()) {
				return httpBadRequest("Informe o endereço completo para entrega");
			}
			continue;
		}
		if (!(mapa[campo.id] ?? "").trim()) {
			return httpBadRequest(`Preencha o campo ${campo.rotulo}`);
		}
	}

	const modalidadeRaw = (
		valorCampo(mapa, "modalidade", campos) ||
		mapa.modalidade ||
		"delivery"
	).toLowerCase();
	const modalidade =
		modalidadeRaw === "retirada" || modalidadeRaw === "pickup"
			? "retirada"
			: "delivery";

	if (modalidade === "delivery" && cardapio.habilitadelivery !== 1) {
		return httpBadRequest("Esta loja não está aceitando delivery");
	}
	if (modalidade === "retirada" && cardapio.habilitaretirada !== 1) {
		return httpBadRequest("Esta loja não está aceitando retirada");
	}

	const endereco = mapa.endereco || valorCampo(mapa, "endereco", campos) || "";
	const numero = mapa.numero || "";
	const bairro = mapa.bairro || "";
	const complemento = mapa.complemento || "";
	const referencia = mapa.referencia || "";
	const documento = mapa.documento || valorCampo(mapa, "documento", campos);
	const observacao =
		mapa.observacao || valorCampo(mapa, "observacao", campos) || "";
	const idmeiopagamento =
		mapa.pagamento || valorCampo(mapa, "pagamento", campos) || "";

	if (modalidade === "delivery" && (!endereco.trim() || !bairro.trim())) {
		return httpBadRequest("Informe o endereço de entrega");
	}

	let nomemeiopagamento: string | null = null;
	if (idmeiopagamento) {
		const idsPermitidos = cardapio.idmeiospagamento ?? [];
		if (idsPermitidos.length && !idsPermitidos.includes(idmeiopagamento)) {
			return httpBadRequest("Forma de pagamento inválida");
		}
		const meio = await buscarTipoDocumentoFinanceiroPorId(idmeiopagamento);
		if (!meio || meio.idempresa !== cardapio.idempresa) {
			return httpBadRequest("Forma de pagamento inválida");
		}
		nomemeiopagamento = meio.descricao;
	}

	const ids = [
		...new Set(
			params.itens.flatMap((item) =>
				[item.idproduto, item.idprodutomeio].filter((id): id is string =>
					Boolean(id),
				),
			),
		),
	];
	const produtos = await buscarProdutosCardapioPorIds(cardapio.idempresa, ids);
	const porId = new Map(produtos.map((produto) => [produto.id, produto]));

	const itens: ItemPedidoCardapio[] = [];
	let subtotal = 0;

	for (const item of params.itens) {
		const quantidade = Number(item.quantidade);
		if (!Number.isFinite(quantidade) || quantidade <= 0) {
			return httpBadRequest("Quantidade inválida");
		}
		const produto = porId.get(item.idproduto);
		if (!produto) {
			return httpBadRequest("Produto indisponível no cardápio");
		}
		const precoBase = numberFromDecimal(produto.preco);
		let precounitario = precoBase;
		let observacaoItem = item.observacao?.trim() || null;

		if (item.idprodutomeio) {
			if (Number(produto.espizza) !== 1) {
				return httpBadRequest("Meio a meio só é permitido em pizzas");
			}
			const segundo = porId.get(item.idprodutomeio);
			if (!segundo || Number(segundo.espizza) !== 1) {
				return httpBadRequest("Segundo sabor inválido");
			}
			precounitario = precoPizzaMeioAMeio(
				precoBase,
				numberFromDecimal(segundo.preco),
			);
			const descricao = `Pizza meio a meio: ${produto.descricao || produto.nome} / ${segundo.descricao || segundo.nome}`;
			observacaoItem = observacaoItem
				? `${descricao} | ${observacaoItem}`
				: descricao;
		}

		const precototal = arredondarDinheiro(precounitario * quantidade);
		subtotal = arredondarDinheiro(subtotal + precototal);
		itens.push({
			idproduto: produto.id,
			quantidade,
			observacao: observacaoItem,
			idprodutomeio: item.idprodutomeio || null,
			nomeproduto: produto.descricao || produto.nome || "",
			precounitario,
			precototal,
		});
	}

	const minimo = numberFromDecimal(cardapio.pedidominimo);
	if (minimo > 0 && subtotal < minimo) {
		return httpBadRequest(
			`Pedido mínimo de ${minimo.toLocaleString("pt-BR", {
				style: "currency",
				currency: "BRL",
			})}`,
		);
	}

	const valorentrega = resolverTaxaEntrega({
		modalidade,
		bairro,
		taxaPadrao: numberFromDecimal(cardapio.taxaentregapadrao),
		bairros: cardapio.bairrosentrega ?? [],
	});
	const total = arredondarDinheiro(subtotal + valorentrega);
	const agora = new Date().toISOString();
	const protocolo = await gerarProtocoloUnico();

	const criado = await criarPedidoCardapioDelivery({
		id: uuidv4(),
		idempresa: cardapio.idempresa,
		idcardapio: cardapio.id,
		protocolo,
		clientorderid,
		status: "pendente",
		modalidade,
		nomecliente,
		telefone,
		documento: documento || null,
		endereco: modalidade === "delivery" ? endereco : null,
		numero: modalidade === "delivery" ? numero : null,
		bairro: modalidade === "delivery" ? bairro : null,
		complemento: modalidade === "delivery" ? complemento : null,
		referencia: modalidade === "delivery" ? referencia : null,
		idmeiopagamento: idmeiopagamento || null,
		nomemeiopagamento,
		observacao: observacao || null,
		subtotal: subtotal.toFixed(2),
		valorentrega: valorentrega.toFixed(2),
		total: total.toFixed(2),
		itens,
		respostas: params.respostas,
		atualizadoem: agora,
	});

	if (!criado) {
		return httpBadRequest("Não foi possível registrar o pedido");
	}

	return httpCriacao(mapearPedidoCriado(criado, cardapio.chavepix));
}

function mapearPedidoCriado(
	pedido: PedidoCardapioDelivery,
	chavepix: string | null,
): PedidoCardapioPublicoCriado {
	const total = numberFromDecimal(pedido.total);
	const meio = (pedido.nomemeiopagamento ?? "").toLowerCase();
	const ehPix = meio.includes("pix");
	return {
		id: pedido.id,
		protocolo: pedido.protocolo,
		status: pedido.status,
		total,
		subtotal: numberFromDecimal(pedido.subtotal),
		valorentrega: numberFromDecimal(pedido.valorentrega),
		modalidade: pedido.modalidade,
		chavepix: ehPix ? chavepix : null,
		pixCopiaCola:
			ehPix && chavepix
				? montarPixCopiaCola({
						chave: chavepix,
						nome: pedido.nomecliente,
						cidade: "BRASIL",
						valor: total,
						txid: pedido.protocolo,
					})
				: null,
	};
}
