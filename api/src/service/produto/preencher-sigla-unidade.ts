import {
	buscarUnidadeMedidaPorId,
	listarUnidadesMedidaPorEmpresa,
} from "@/repositories/unidade-medida-repositories.js";

type ProdutoComUnidade = {
	unidademedida?: string | null;
	idunidademedida?: string | null;
};

type UnidadeSigla = {
	codigo?: string | null;
	nome?: string | null;
};

export function siglaUnidadeProduto(
	atual: string | null | undefined,
	unidade: UnidadeSigla | null | undefined,
): string | null {
	const texto = atual?.trim();
	if (texto) return texto;
	const codigo = unidade?.codigo?.trim();
	if (codigo) return codigo;
	const nome = unidade?.nome?.trim();
	return nome || null;
}

export function codigoUnidadeParaGravar(
	codigo: string | null | undefined,
): string | null {
	const limpo = codigo?.trim();
	if (!limpo) return null;
	return limpo.slice(0, 6);
}

type ProdutoGravacaoUnidade = {
	idunidademedida?: string | null;
	unidademedida?: string | null;
};

/** Grava a sigla junto com o id, no limite da coluna do produto. */
export async function comCodigoUnidadeGravado<T extends ProdutoGravacaoUnidade>(
	dados: T,
): Promise<T> {
	if (!dados.idunidademedida) return dados;
	const unidade = await buscarUnidadeMedidaPorId(dados.idunidademedida);
	const codigo = codigoUnidadeParaGravar(unidade?.codigo);
	if (!codigo) return dados;
	return { ...dados, unidademedida: codigo };
}

/** Preenche a sigla quando o cadastro só tem o id da unidade. */
export async function preencherSiglaUnidade<T extends ProdutoComUnidade>(
	idempresa: string,
	produtos: T[],
): Promise<T[]> {
	const faltando = produtos.some(
		(produto) =>
			!produto.unidademedida?.trim() && Boolean(produto.idunidademedida?.trim()),
	);
	if (!faltando) return produtos;

	const unidades = await listarUnidadesMedidaPorEmpresa(idempresa);
	const mapa = new Map(unidades.map((unidade) => [unidade.id, unidade]));

	return produtos.map((produto) => {
		if (produto.unidademedida?.trim() || !produto.idunidademedida) {
			return produto;
		}
		const sigla = siglaUnidadeProduto(
			produto.unidademedida,
			mapa.get(produto.idunidademedida),
		);
		if (!sigla) return produto;
		return { ...produto, unidademedida: sigla };
	});
}
