import { v4 as uuidv4 } from "uuid";
import type { Produto } from "@/model/produto-model.js";
import {
	buscarProdutoPorCodigoOuEan,
	buscarProdutoPorDescricao,
	buscarProdutoPorId,
	criarProduto,
} from "@/repositories/produtos-repositories.js";
import {
	inteiroValidoParaPostgres,
	normalizarCodigoBarras,
	truncarTexto,
} from "@/util/texto-util.js";

export type DadosProdutoNF = {
	idempresa: string;
	idproduto?: string | undefined;
	codigoproduto?: number | undefined;
	ean?: string | undefined;
	descricaoproduto?: string | undefined;
	idncm?: string | undefined;
	ncm?: string | undefined;
	idunidademedida?: string | undefined;
	idcfopentrada?: string | undefined;
	idcfopsaida?: string | undefined;
	idcfopsaidanfce?: string | undefined;
	cfopvendaecf?: number | undefined;
	idcest?: string | undefined;
	idfornecedor?: string | undefined;
	idgrupo?: string | undefined;
	custoaquisicao?: string | undefined;
	preco?: string | undefined;
	fatorconversao?: string | undefined;
	origem?: number | undefined;
	situacaotributariaentrada?: string | undefined;
	situacaotributaria?: string | undefined;
	situacaotributariasn?: string | undefined;
	tributacaoespecial?: string | undefined;
	tributacaosn?: string | undefined;
	cstpisentrada?: string | undefined;
	cstcofinsentrada?: string | undefined;
	cstpis?: string | undefined;
	cstcofins?: string | undefined;
};

type VincularOuCriarProdutoResultado =
	| { encontrado: true; produto: Produto }
	| { encontrado: false; produto: Produto; criado: true }
	| { encontrado: false; produto: null; criado: false; erro: string };

export async function buscarProdutoParaNf(
	dados: DadosProdutoNF,
): Promise<Produto | null> {
	if (dados.idproduto) {
		const produto = await buscarProdutoPorId(dados.idproduto);

		if (produto && produto.idempresa === dados.idempresa) {
			return produto;
		}
	}

	const eanBusca = normalizarCodigoBarras(dados.ean);

	if (dados.codigoproduto !== undefined || eanBusca) {
		const codigoBusca = inteiroValidoParaPostgres(dados.codigoproduto);
		const produto = await buscarProdutoPorCodigoOuEan(
			dados.idempresa,
			codigoBusca,
			eanBusca ?? undefined,
		);

		if (produto) {
			return produto;
		}
	}

	if (dados.descricaoproduto) {
		const descricaoProduto = truncarTexto(dados.descricaoproduto, 100);

		if (descricaoProduto) {
			const produtoExistente = await buscarProdutoPorDescricao(
				dados.idempresa,
				descricaoProduto,
			);

			if (produtoExistente) {
				return produtoExistente;
			}
		}
	}

	return null;
}

export async function criarProdutoParaNf(
	dados: DadosProdutoNF,
): Promise<Produto | null> {
	if (!dados.descricaoproduto) {
		return null;
	}

	const descricaoProduto = truncarTexto(dados.descricaoproduto, 100);
	const nomeProduto =
		truncarTexto(dados.descricaoproduto, 120) ?? descricaoProduto ?? "Produto";
	const ean = normalizarCodigoBarras(dados.ean);

	return (
		(await criarProduto({
			id: uuidv4(),
			idempresa: dados.idempresa,
			nome: nomeProduto,
			descricao: descricaoProduto ?? nomeProduto,
			codigo: inteiroValidoParaPostgres(dados.codigoproduto) ?? null,
			ean,
			eantributavel: ean,
			idncm: dados.idncm ?? null,
			ncm: dados.ncm ?? null,
			idunidademedida: dados.idunidademedida ?? null,
			idcfopentrada: dados.idcfopentrada ?? null,
			idcfopsaida: dados.idcfopsaida ?? null,
			idcfopsaidanfce: dados.idcfopsaidanfce ?? dados.idcfopsaida ?? null,
			cfopvendaecf: dados.cfopvendaecf ?? null,
			idcest: dados.idcest ?? null,
			idfornecedor: dados.idfornecedor ?? null,
			idgrupo: dados.idgrupo ?? null,
			custoaquisicao: dados.custoaquisicao ?? null,
			preco: dados.preco ?? null,
			fatorconversao: dados.fatorconversao ?? "1",
			origem: dados.origem ?? null,
			situacaotributariasnentrada: dados.situacaotributariaentrada ?? null,
			situacaotributaria: dados.situacaotributaria ?? null,
			situacaotributariasn: dados.situacaotributariasn ?? null,
			tributacaoespecial: dados.tributacaoespecial ?? null,
			tributacaosn: dados.tributacaosn ?? null,
			cstpisentrada: dados.cstpisentrada ?? null,
			cstcofinsentrada: dados.cstcofinsentrada ?? null,
			cstpis: dados.cstpis ?? null,
			cstcofins: dados.cstcofins ?? null,
			tipo: "P",
			inativo: 0,
			datacadastro: new Date().toISOString(),
		}).catch(() => null)) ?? null
	);
}

export function montarAtualizacaoProdutoNf(
	dados: DadosProdutoNF,
): Partial<import("@/model/produto-model.js").NovoProduto> {
	const ean = normalizarCodigoBarras(dados.ean);

	return {
		preco: dados.preco ?? undefined,
		fatorconversao: dados.fatorconversao,
		custoaquisicao: dados.custoaquisicao,
		idcfopentrada: dados.idcfopentrada ?? undefined,
		idcfopsaida: dados.idcfopsaida ?? undefined,
		idcfopsaidanfce: dados.idcfopsaidanfce ?? dados.idcfopsaida ?? undefined,
		cfopvendaecf: dados.cfopvendaecf ?? undefined,
		idcest: dados.idcest ?? undefined,
		idunidademedida: dados.idunidademedida ?? undefined,
		idgrupo: dados.idgrupo ?? undefined,
		ean: ean ?? undefined,
		eantributavel: ean ?? undefined,
		idncm: dados.idncm ?? undefined,
		ncm: dados.ncm ?? undefined,
		origem: dados.origem ?? undefined,
		situacaotributariasnentrada: dados.situacaotributariaentrada ?? undefined,
		situacaotributaria: dados.situacaotributaria ?? undefined,
		situacaotributariasn: dados.situacaotributariasn ?? undefined,
		tributacaoespecial: dados.tributacaoespecial ?? undefined,
		tributacaosn: dados.tributacaosn ?? undefined,
		cstpisentrada: dados.cstpisentrada ?? undefined,
		cstcofinsentrada: dados.cstcofinsentrada ?? undefined,
		cstpis: dados.cstpis ?? undefined,
		cstcofins: dados.cstcofins ?? undefined,
	};
}

export async function vincularOuCriarProdutoService(
	dados: DadosProdutoNF,
): Promise<VincularOuCriarProdutoResultado> {
	const produtoEncontrado = await buscarProdutoParaNf(dados);

	if (produtoEncontrado) {
		return { encontrado: true, produto: produtoEncontrado };
	}

	if (!dados.descricaoproduto) {
		return {
			encontrado: false,
			produto: null,
			criado: false,
			erro: "Produto não encontrado. Informe idproduto ou descricaoproduto para cadastrar.",
		};
	}

	const novoProduto = await criarProdutoParaNf(dados);

	if (!novoProduto) {
		return {
			encontrado: false,
			produto: null,
			criado: false,
			erro: "Falha ao cadastrar produto automaticamente.",
		};
	}

	return { encontrado: false, produto: novoProduto, criado: true };
}
