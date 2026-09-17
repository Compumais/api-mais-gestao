import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { PedidoCompraCompleto } from "@/model/pedido-compra-model.js";
import { STATUS_PEDIDO_COMPRA } from "@/model/pedido-compra-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	buscarProximoCodigoPedidoCompra,
	criarPedidosCompraEmLote,
	listarItensPedidoCompraEnriquecidos,
} from "@/repositories/pedido-compra-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { criarCotacaoCompraService } from "@/service/cotacoes-compra/criar-cotacao-compra.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

export type ItemPedidoCompraInput = {
	idproduto: string;
	quantidade: string;
	precounitario: string;
};

export type CriarPedidoCompraParametros = {
	idusuario: string;
	idempresa: string;
	identidade: string;
	fornecedortelefone?: string | null;
	observacao?: string | null;
	comoCotacao?: boolean;
	tituloCotacao?: string | null;
	validade?: string | null;
	itens: ItemPedidoCompraInput[];
};

function normalizarDecimal(valor: string) {
	return valor.replace(",", ".");
}

function arredondar(valor: number) {
	return Math.round(valor * 100) / 100;
}

function normalizarTelefone(valor: string | null | undefined) {
	return (valor ?? "").trim().slice(0, 20);
}

export async function criarPedidoCompraService({
	idusuario,
	idempresa,
	identidade,
	fornecedortelefone,
	observacao,
	comoCotacao = false,
	tituloCotacao,
	validade,
	itens,
}: CriarPedidoCompraParametros): Promise<HttpResponse<PedidoCompraCompleto>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const fornecedor = await buscarEntidadePorId(identidade);
	if (!fornecedor || fornecedor.idempresa !== idempresa) {
		return httpNaoEncontrado("Fornecedor não encontrado");
	}
	if (fornecedor.fornecedor !== 1) {
		return httpBadRequest(
			"A entidade selecionada não está cadastrada como fornecedor",
		);
	}

	const telefone = normalizarTelefone(
		fornecedortelefone || fornecedor.telefone,
	);
	if (!telefone) {
		return httpBadRequest("Informe o telefone do fornecedor");
	}

	if (!itens || itens.length === 0) {
		return httpBadRequest("Informe ao menos um produto no pedido");
	}

	const ids = new Set<string>();
	const itensNormalizados: Array<{
		idproduto: string;
		descricao: string | null;
		quantidade: string;
		precounitario: string;
		total: string;
	}> = [];

	for (let i = 0; i < itens.length; i++) {
		const item = itens[i]!;
		if (ids.has(item.idproduto)) {
			return httpBadRequest("Produto duplicado no pedido");
		}
		ids.add(item.idproduto);

		const produto = await buscarProdutoPorId(item.idproduto);
		if (!produto || produto.idempresa !== idempresa) {
			return httpBadRequest(`Produto não encontrado na empresa (item ${i + 1})`);
		}

		const quantidade = Number.parseFloat(normalizarDecimal(item.quantidade));
		const unitario = Number.parseFloat(normalizarDecimal(item.precounitario));
		if (Number.isNaN(quantidade) || quantidade <= 0) {
			return httpBadRequest(`Quantidade inválida no item ${i + 1}`);
		}
		if (Number.isNaN(unitario) || unitario < 0) {
			return httpBadRequest(`Preço inválido no item ${i + 1}`);
		}

		const total = arredondar(quantidade * unitario).toFixed(2);
		itensNormalizados.push({
			idproduto: produto.id,
			descricao: produto.descricao || produto.nome || null,
			quantidade: quantidade.toFixed(6),
			precounitario: unitario.toFixed(2),
			total,
		});
	}

	let idcotacao: string | null = null;
	let cotacaotitulo: string | null = null;
	let cotacaocodigo: number | null = null;

	if (comoCotacao) {
		const titulo =
			(tituloCotacao ?? "").trim() ||
			`Cotação — ${fornecedor.nome}`.slice(0, 120);
		const cotacao = await criarCotacaoCompraService({
			idusuario,
			idempresa,
			titulo,
			observacao: observacao ?? null,
			validade: validade ?? null,
			itens: itensNormalizados.map((item) => ({
				idproduto: item.idproduto,
				descricao: item.descricao,
				quantidade: item.quantidade,
			})),
		});
		if (!cotacao.success || !cotacao.body) {
			return cotacao as HttpResponse<PedidoCompraCompleto>;
		}
		idcotacao = cotacao.body.id;
		cotacaotitulo = cotacao.body.titulo;
		cotacaocodigo = cotacao.body.codigo;
	}

	const idPedido = uuidv4();
	const codigo = await buscarProximoCodigoPedidoCompra(idempresa);
	const valortotal = itensNormalizados
		.reduce((acc, item) => acc + Number(item.total), 0)
		.toFixed(2);

	const [criado] = await criarPedidosCompraEmLote([
		{
			cabecalho: {
				id: idPedido,
				idempresa,
				codigo,
				idcotacao,
				idproposta: null,
				identidade: fornecedor.id,
				fornecedornome: fornecedor.nome,
				fornecedortelefone: telefone,
				valortotal,
				status: STATUS_PEDIDO_COMPRA.ABERTO,
				observacao: observacao ?? null,
				currenttimemillis: Date.now(),
			},
			itens: itensNormalizados.map((item) => ({
				id: uuidv4(),
				idpedidocompra: idPedido,
				idproduto: item.idproduto,
				descricao: item.descricao,
				quantidade: item.quantidade,
				precounitario: item.precounitario,
				total: item.total,
				idcotacaoitem: null,
			})),
		},
	]);

	if (!criado) {
		return httpBadRequest("Falha ao criar pedido de compra");
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_pedido_compra",
		idusuario,
		recurso: "pedido_compra",
		idrecurso: idPedido,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: { codigo, comoCotacao, idcotacao },
	});

	const itensEnriquecidos = await listarItensPedidoCompraEnriquecidos(idPedido);

	return httpCriacao<PedidoCompraCompleto>({
		...criado.cabecalho,
		itens: itensEnriquecidos,
		cotacaotitulo,
		cotacaocodigo,
	});
}
