import { v4 as uuidv4 } from "uuid";
import type {
	CotacaoCompraCompleta,
	NovoCotacaoCompraItem,
} from "@/model/cotacao-compra-model.js";
import { STATUS_COTACAO_COMPRA } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarProximoCodigoCotacaoCompra,
	criarCotacaoCompraComItens,
	listarItensCotacaoCompraEnriquecidos,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import {
	httpBadRequest,
	httpCriacao,
	httpErroInterno,
	httpProibido,
} from "@/util/http-util.js";

export type ItemCotacaoCompraInput = {
	idproduto?: string | null;
	descricao?: string | null;
	quantidade: string;
	unidademedida?: string | null;
	observacao?: string | null;
	ordem?: number;
};

export type CriarCotacaoCompraParametros = {
	idusuario: string;
	idempresa: string;
	titulo: string;
	observacao?: string | null;
	validade?: string | null;
	itens: ItemCotacaoCompraInput[];
};

function normalizarQuantidade(valor: string) {
	return valor.replace(",", ".");
}

function nomeItemLivre(item: ItemCotacaoCompraInput) {
	return (item.descricao ?? "").trim();
}

export async function validarItensCotacao(
	idempresa: string,
	itens: ItemCotacaoCompraInput[],
): Promise<HttpResponse<NovoCotacaoCompraItem[]> | { success: true; itens: NovoCotacaoCompraItem[] }> {
	if (!itens || itens.length === 0) {
		return httpBadRequest("Informe ao menos um produto na cotação");
	}

	const ids = new Set<string>();
	const descricoes = new Set<string>();
	const normalizados: NovoCotacaoCompraItem[] = [];

	for (let i = 0; i < itens.length; i++) {
		const item = itens[i]!;
		const idproduto = item.idproduto?.trim() || null;
		const descricaoInformada = nomeItemLivre(item);

		const qtd = Number.parseFloat(normalizarQuantidade(item.quantidade));
		if (Number.isNaN(qtd) || qtd <= 0) {
			return httpBadRequest(`Quantidade inválida no item ${i + 1}`);
		}

		if (idproduto) {
			if (ids.has(idproduto)) {
				return httpBadRequest("Produto duplicado na cotação");
			}
			ids.add(idproduto);

			const produto = await buscarProdutoPorId(idproduto);
			if (!produto || produto.idempresa !== idempresa) {
				return httpBadRequest(`Produto não encontrado na empresa (item ${i + 1})`);
			}

			normalizados.push({
				id: uuidv4(),
				idcotacao: "",
				idproduto,
				descricao:
					descricaoInformada ||
					produto.descricao ||
					produto.nome ||
					null,
				quantidade: qtd.toFixed(6),
				unidademedida: item.unidademedida ?? produto.unidademedida ?? null,
				observacao: item.observacao ?? null,
				ordem: item.ordem ?? i,
			});
			continue;
		}

		if (descricaoInformada.length < 2) {
			return httpBadRequest(
				`Informe o produto cadastrado ou o nome do item ${i + 1}`,
			);
		}

		const chaveDescricao = descricaoInformada.toLowerCase();
		if (descricoes.has(chaveDescricao)) {
			return httpBadRequest("Produto duplicado na cotação");
		}
		descricoes.add(chaveDescricao);

		normalizados.push({
			id: uuidv4(),
			idcotacao: "",
			idproduto: null,
			descricao: descricaoInformada,
			quantidade: qtd.toFixed(6),
			unidademedida: item.unidademedida ?? null,
			observacao: item.observacao ?? null,
			ordem: item.ordem ?? i,
		});
	}

	return { success: true, itens: normalizados };
}

export async function criarCotacaoCompraService({
	idusuario,
	idempresa,
	titulo,
	observacao,
	validade,
	itens,
}: CriarCotacaoCompraParametros): Promise<HttpResponse<CotacaoCompraCompleta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const itensValidados = await validarItensCotacao(idempresa, itens);
	if (!("itens" in itensValidados) || !itensValidados.success) {
		return itensValidados as HttpResponse<CotacaoCompraCompleta>;
	}

	const id = uuidv4();
	const codigo = await buscarProximoCodigoCotacaoCompra(idempresa);
	const agora = Date.now();

	const resultado = await criarCotacaoCompraComItens(
		{
			id,
			idempresa,
			codigo,
			titulo: titulo.trim(),
			observacao: observacao ?? null,
			status: STATUS_COTACAO_COMPRA.RASCUNHO,
			tokenpublico: null,
			validade: validade ?? null,
			currenttimemillis: agora,
		},
		itensValidados.itens.map((item) => ({ ...item, idcotacao: id })),
	);

	if (!resultado) {
		return httpErroInterno();
	}

	await criarAuditoriaService({
		id: uuidv4(),
		acao: "criar_cotacao_compra",
		idusuario,
		recurso: "cotacao_compra",
		idrecurso: id,
		idempresa,
		criadoem: new Date().toISOString(),
		metadados: { codigo, titulo },
	});

	const itensEnriquecidos = await listarItensCotacaoCompraEnriquecidos(id);

	return httpCriacao<CotacaoCompraCompleta>({
		...resultado.cotacao,
		itens: itensEnriquecidos,
		totalpropostas: 0,
	});
}
