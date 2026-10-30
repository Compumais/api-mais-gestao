import { basename } from "node:path";
import { v4 as uuidv4 } from "uuid";
import type { Produto } from "@/model/produto-model.js";
import {
	atualizarCaminhoImagemDosVinculos,
	atualizarGrupoBanco,
	atualizarProdutoBanco,
	buscarGrupoBancoPorId,
	buscarIdsProdutosBanco,
	buscarProdutoBancoPorCodigo,
	buscarProdutoBancoPorId,
	buscarProdutosBancoPorIds,
	type CodigoBanco,
	definirPonteiroProdutoEmpresa,
	excluirGrupoBanco,
	excluirProdutoBanco,
	type GrupoBanco,
	inserirGrupoBanco,
	inserirProdutoBanco,
	limparCaminhoImagemDosVinculos,
	limparPonteiroBancoProduto,
	listarCodigosBanco,
	listarGruposBanco,
	listarProdutosBanco,
	type ProdutoBanco,
	produtoEmpresaTemMidiaPropria,
	substituirCodigosBanco,
} from "@/repositories/banco-imagem-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import {
	gravarArquivoBanco,
	lerArquivoBanco,
	referenciaImagemGrupo,
	referenciaImagemProdutoBanco,
	removerArquivoBanco,
	tokenDaReferencia,
} from "@/service/banco-imagem/armazenamento.js";
import {
	camposVinculoPorEan,
} from "@/service/banco-imagem/resolver-vinculo-banco.js";
import { validarImagemProduto } from "@/service/produto/imagem-produto.js";
import { normalizarCodigoBarras } from "@/util/normalizar-codigo-barras.js";

const LIMITE_CODIGOS = 30;

export class ErroBancoImagem extends Error {
	constructor(
		mensagem: string,
		public readonly status: number,
		public readonly codigo: string,
	) {
		super(mensagem);
		this.name = "ErroBancoImagem";
	}
}

export type GrupoBancoResposta = {
	id: string;
	nome: string;
	ordem: number;
	ativo: boolean;
	referencia: string | null;
	temImagem: boolean;
};

export type CodigoBancoResposta = {
	id: string;
	codigo: string;
};

export type ProdutoBancoResposta = {
	id: string;
	idgrupo: string;
	grupo: string;
	nome: string;
	ativo: boolean;
	referencia: string | null;
	temImagem: boolean;
	codigos: CodigoBancoResposta[];
};

function sanitizarNomeArquivo(nome: string | undefined): string | null {
	if (!nome) return null;
	return (
		basename(nome)
			.replace(/[^\p{L}\p{N}._ -]/gu, "_")
			.slice(0, 255) || null
	);
}

function respostaGrupo(grupo: GrupoBanco): GrupoBancoResposta {
	return {
		id: grupo.id,
		nome: grupo.nome,
		ordem: grupo.ordem,
		ativo: grupo.ativo,
		referencia: grupo.referencia,
		temImagem: Boolean(grupo.chavearmazenamento),
	};
}

function respostaProduto(
	produto: ProdutoBanco,
	grupoNome: string,
	codigos: CodigoBanco[],
): ProdutoBancoResposta {
	return {
		id: produto.id,
		idgrupo: produto.idgrupo,
		grupo: grupoNome,
		nome: produto.nome,
		ativo: produto.ativo,
		referencia: produto.referencia,
		temImagem: Boolean(produto.chavearmazenamento),
		codigos: codigos.map((codigo) => ({
			id: codigo.id,
			codigo: codigo.codigo,
		})),
	};
}

async function montarProdutos(
	produtosBanco: ProdutoBanco[],
): Promise<ProdutoBancoResposta[]> {
	if (produtosBanco.length === 0) return [];
	const grupos = await listarGruposBanco();
	const nomes = new Map(grupos.map((grupo) => [grupo.id, grupo.nome]));
	const codigos = await listarCodigosBanco(produtosBanco.map((item) => item.id));
	return produtosBanco.map((produto) =>
		respostaProduto(
			produto,
			nomes.get(produto.idgrupo) ?? "",
			codigos.filter((codigo) => codigo.idproduto === produto.id),
		),
	);
}

function normalizarListaCodigos(codigos: string[]): string[] {
	if (codigos.length > LIMITE_CODIGOS) {
		throw new ErroBancoImagem(
			`Informe no máximo ${LIMITE_CODIGOS} códigos de barras`,
			400,
			"CODIGOS_DEMAIS",
		);
	}
	const unicos = new Set<string>();
	for (const codigo of codigos) {
		const normalizado = normalizarCodigoBarras(codigo);
		if (!normalizado) {
			throw new ErroBancoImagem(
				"Código de barras inválido. Use até 14 dígitos",
				400,
				"CODIGO_INVALIDO",
			);
		}
		unicos.add(normalizado);
	}
	return [...unicos];
}

function ehCodigoDuplicado(erro: unknown): boolean {
	const atual = erro as { code?: string; cause?: { code?: string } };
	return atual.code === "23505" || atual.cause?.code === "23505";
}

async function gravarCodigos(idproduto: string, codigos: string[]) {
	try {
		await substituirCodigosBanco(
			idproduto,
			codigos.map((codigo) => ({ id: uuidv4(), codigo })),
		);
	} catch (erro) {
		if (ehCodigoDuplicado(erro)) {
			throw new ErroBancoImagem(
				"Este código de barras já está cadastrado no banco de imagens",
				409,
				"CODIGO_DUPLICADO",
			);
		}
		throw erro;
	}
}

async function produtoResposta(id: string): Promise<ProdutoBancoResposta> {
	const produto = await buscarProdutoBancoPorId(id);
	if (!produto) {
		throw new ErroBancoImagem("Produto do banco não encontrado", 404, "NOT_FOUND");
	}
	const [resposta] = await montarProdutos([produto]);
	if (!resposta) {
		throw new ErroBancoImagem("Produto do banco não encontrado", 404, "NOT_FOUND");
	}
	return resposta;
}

export async function listarGruposBancoService(): Promise<GrupoBancoResposta[]> {
	const grupos = await listarGruposBanco();
	return grupos.map(respostaGrupo);
}

export async function criarGrupoBancoService(params: {
	nome: string;
	ordem?: number | undefined;
	ativo?: boolean | undefined;
}): Promise<GrupoBancoResposta> {
	const nome = params.nome.trim();
	if (!nome) {
		throw new ErroBancoImagem("Nome do grupo é obrigatório", 400, "NOME_OBRIGATORIO");
	}
	const criado = await inserirGrupoBanco({
		id: uuidv4(),
		nome: nome.slice(0, 120),
		ordem: params.ordem ?? 0,
		ativo: params.ativo ?? true,
	});
	if (!criado) {
		throw new ErroBancoImagem("Não foi possível criar o grupo", 500, "FALHA_GRAVACAO");
	}
	return respostaGrupo(criado);
}

export async function atualizarGrupoBancoService(params: {
	id: string;
	nome?: string | undefined;
	ordem?: number | undefined;
	ativo?: boolean | undefined;
}): Promise<GrupoBancoResposta> {
	const existente = await buscarGrupoBancoPorId(params.id);
	if (!existente) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	const nome = params.nome?.trim();
	const atualizado = await atualizarGrupoBanco(params.id, {
		...(nome ? { nome: nome.slice(0, 120) } : {}),
		...(params.ordem !== undefined ? { ordem: params.ordem } : {}),
		...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
	});
	if (!atualizado) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	return respostaGrupo(atualizado);
}

export async function excluirGrupoBancoService(id: string): Promise<void> {
	const grupo = await buscarGrupoBancoPorId(id);
	if (!grupo) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	const produtos = await listarProdutosBanco(id);
	await limparCaminhoImagemDosVinculos(produtos.map((produto) => produto.id));
	await excluirGrupoBanco(id);
	await removerArquivoBanco(grupo.chavearmazenamento);
	await Promise.all(
		produtos.map((produto) => removerArquivoBanco(produto.chavearmazenamento)),
	);
}

export async function listarProdutosBancoService(
	idgrupo?: string,
): Promise<ProdutoBancoResposta[]> {
	return montarProdutos(await listarProdutosBanco(idgrupo));
}

export async function buscarProdutoBancoService(
	id: string,
): Promise<ProdutoBancoResposta> {
	return produtoResposta(id);
}

export async function criarProdutoBancoService(params: {
	idgrupo: string;
	nome: string;
	ativo?: boolean | undefined;
	codigos?: string[] | undefined;
}): Promise<ProdutoBancoResposta> {
	const grupo = await buscarGrupoBancoPorId(params.idgrupo);
	if (!grupo) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	const nome = params.nome.trim();
	if (!nome) {
		throw new ErroBancoImagem("Nome do produto é obrigatório", 400, "NOME_OBRIGATORIO");
	}
	const codigos = normalizarListaCodigos(params.codigos ?? []);
	const criado = await inserirProdutoBanco({
		id: uuidv4(),
		idgrupo: params.idgrupo,
		nome: nome.slice(0, 160),
		ativo: params.ativo ?? true,
	});
	if (!criado) {
		throw new ErroBancoImagem("Não foi possível criar o produto", 500, "FALHA_GRAVACAO");
	}
	try {
		await gravarCodigos(criado.id, codigos);
	} catch (erro) {
		await excluirProdutoBanco(criado.id);
		throw erro;
	}
	return produtoResposta(criado.id);
}

export async function atualizarProdutoBancoService(params: {
	id: string;
	idgrupo?: string | undefined;
	nome?: string | undefined;
	ativo?: boolean | undefined;
	codigos?: string[] | undefined;
}): Promise<ProdutoBancoResposta> {
	const existente = await buscarProdutoBancoPorId(params.id);
	if (!existente) {
		throw new ErroBancoImagem("Produto do banco não encontrado", 404, "NOT_FOUND");
	}
	if (params.idgrupo) {
		const grupo = await buscarGrupoBancoPorId(params.idgrupo);
		if (!grupo) {
			throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
		}
	}
	const nome = params.nome?.trim();
	const atualizado = await atualizarProdutoBanco(params.id, {
		...(params.idgrupo ? { idgrupo: params.idgrupo } : {}),
		...(nome ? { nome: nome.slice(0, 160) } : {}),
		...(params.ativo !== undefined ? { ativo: params.ativo } : {}),
	});
	if (!atualizado) {
		throw new ErroBancoImagem("Produto do banco não encontrado", 404, "NOT_FOUND");
	}
	if (params.codigos) {
		await gravarCodigos(params.id, normalizarListaCodigos(params.codigos));
	}
	return produtoResposta(params.id);
}

export async function excluirProdutoBancoService(id: string): Promise<void> {
	const produto = await buscarProdutoBancoPorId(id);
	if (!produto) {
		throw new ErroBancoImagem("Produto do banco não encontrado", 404, "NOT_FOUND");
	}
	await limparCaminhoImagemDosVinculos([id]);
	await excluirProdutoBanco(id);
	await removerArquivoBanco(produto.chavearmazenamento);
}

async function salvarImagem(params: {
	id: string;
	conteudo: Buffer;
	tipoInformado: string | undefined;
	nomeArquivo?: string | undefined;
	referencia: (token: string) => string;
	chaveAnterior: string | null;
	persistir: (dados: {
		nomearquivo: string | null;
		tipomime: string;
		tamanho: number;
		referencia: string;
		chavearmazenamento: string;
	}) => Promise<void>;
	depois?: (token: string) => Promise<void>;
}): Promise<void> {
	const tipo = validarImagemProduto(params.conteudo, params.tipoInformado);
	const arquivo = await gravarArquivoBanco({
		id: params.id,
		conteudo: params.conteudo,
		tipo,
	});
	try {
		await params.persistir({
			nomearquivo: sanitizarNomeArquivo(params.nomeArquivo),
			tipomime: arquivo.tipo,
			tamanho: arquivo.tamanho,
			referencia: params.referencia(arquivo.token),
			chavearmazenamento: arquivo.chave,
		});
	} catch (erro) {
		await removerArquivoBanco(arquivo.chave);
		throw erro;
	}
	await removerArquivoBanco(params.chaveAnterior);
	await params.depois?.(arquivo.token);
}

export async function salvarImagemGrupoBancoService(params: {
	id: string;
	conteudo: Buffer;
	tipoInformado: string | undefined;
	nomeArquivo?: string | undefined;
}): Promise<GrupoBancoResposta> {
	const grupo = await buscarGrupoBancoPorId(params.id);
	if (!grupo) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	await salvarImagem({
		id: grupo.id,
		conteudo: params.conteudo,
		tipoInformado: params.tipoInformado,
		nomeArquivo: params.nomeArquivo,
		chaveAnterior: grupo.chavearmazenamento,
		referencia: (token) => referenciaImagemGrupo(grupo.id, token),
		persistir: async (dados) => {
			await atualizarGrupoBanco(grupo.id, dados);
		},
	});
	const atualizado = await buscarGrupoBancoPorId(grupo.id);
	if (!atualizado) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	return respostaGrupo(atualizado);
}

export async function removerImagemGrupoBancoService(
	id: string,
): Promise<GrupoBancoResposta> {
	const grupo = await buscarGrupoBancoPorId(id);
	if (!grupo?.chavearmazenamento) {
		throw new ErroBancoImagem("Imagem não encontrada", 404, "IMAGEM_NAO_ENCONTRADA");
	}
	await atualizarGrupoBanco(id, {
		nomearquivo: null,
		tipomime: null,
		tamanho: null,
		referencia: null,
		chavearmazenamento: null,
	});
	await removerArquivoBanco(grupo.chavearmazenamento);
	const atualizado = await buscarGrupoBancoPorId(id);
	if (!atualizado) {
		throw new ErroBancoImagem("Grupo não encontrado", 404, "NOT_FOUND");
	}
	return respostaGrupo(atualizado);
}

export async function salvarImagemProdutoBancoService(params: {
	id: string;
	conteudo: Buffer;
	tipoInformado: string | undefined;
	nomeArquivo?: string | undefined;
}): Promise<ProdutoBancoResposta> {
	const produto = await buscarProdutoBancoPorId(params.id);
	if (!produto) {
		throw new ErroBancoImagem("Produto do banco não encontrado", 404, "NOT_FOUND");
	}
	await salvarImagem({
		id: produto.id,
		conteudo: params.conteudo,
		tipoInformado: params.tipoInformado,
		nomeArquivo: params.nomeArquivo,
		chaveAnterior: produto.chavearmazenamento,
		referencia: (token) => referenciaImagemProdutoBanco(produto.id, token),
		persistir: async (dados) => {
			await atualizarProdutoBanco(produto.id, dados);
		},
		depois: async (token) => {
			await atualizarCaminhoImagemDosVinculos({
				idbanco: produto.id,
				token,
			});
		},
	});
	return produtoResposta(produto.id);
}

export async function removerImagemProdutoBancoService(
	id: string,
): Promise<ProdutoBancoResposta> {
	const produto = await buscarProdutoBancoPorId(id);
	if (!produto?.chavearmazenamento) {
		throw new ErroBancoImagem("Imagem não encontrada", 404, "IMAGEM_NAO_ENCONTRADA");
	}
	await atualizarCaminhoImagemDosVinculos({ idbanco: id, token: null });
	await atualizarProdutoBanco(id, {
		nomearquivo: null,
		tipomime: null,
		tamanho: null,
		referencia: null,
		chavearmazenamento: null,
	});
	await removerArquivoBanco(produto.chavearmazenamento);
	return produtoResposta(id);
}

export async function lerImagemGrupoBancoService(id: string) {
	const grupo = await buscarGrupoBancoPorId(id);
	if (!grupo) {
		throw new ErroBancoImagem("Imagem não encontrada", 404, "IMAGEM_NAO_ENCONTRADA");
	}
	const arquivo = await lerArquivoBanco({
		id: grupo.id,
		chave: grupo.chavearmazenamento,
		tipomime: grupo.tipomime,
		referencia: grupo.referencia,
	});
	if (!arquivo) {
		throw new ErroBancoImagem("Imagem não encontrada", 404, "IMAGEM_NAO_ENCONTRADA");
	}
	return arquivo;
}

export async function lerImagemProdutoBancoService(id: string) {
	const produto = await buscarProdutoBancoPorId(id);
	if (!produto) {
		throw new ErroBancoImagem("Imagem não encontrada", 404, "IMAGEM_NAO_ENCONTRADA");
	}
	const arquivo = await lerArquivoBanco({
		id: produto.id,
		chave: produto.chavearmazenamento,
		tipomime: produto.tipomime,
		referencia: produto.referencia,
	});
	if (!arquivo) {
		throw new ErroBancoImagem("Imagem não encontrada", 404, "IMAGEM_NAO_ENCONTRADA");
	}
	return arquivo;
}

export async function buscarBancoImagensService(params: {
	texto?: string | undefined;
	codigo?: string | undefined;
	idgrupo?: string | undefined;
	limite: number;
}): Promise<ProdutoBancoResposta[]> {
	const codigo = params.codigo
		? normalizarCodigoBarras(params.codigo)
		: undefined;
	if (params.codigo && !codigo) return [];
	const ids = await buscarIdsProdutosBanco({
		texto: params.texto?.trim() || undefined,
		codigo: codigo ?? undefined,
		idgrupo: params.idgrupo,
		somenteAtivos: true,
		limite: params.limite,
	});
	if (ids.length === 0) return [];
	const produtos = await buscarProdutosBancoPorIds(ids);
	const porId = new Map(produtos.map((produto) => [produto.id, produto]));
	const ordenados = ids
		.map((id) => porId.get(id))
		.filter((produto): produto is ProdutoBanco => Boolean(produto));
	return montarProdutos(ordenados);
}

async function correspondenciaDoEan(ean: string | null) {
	const codigo = normalizarCodigoBarras(ean);
	if (!codigo) return null;
	const produto = await buscarProdutoBancoPorCodigo(codigo);
	if (!produto || !produto.ativo) return null;
	const grupo = await buscarGrupoBancoPorId(produto.idgrupo);
	if (grupo && !grupo.ativo) return null;
	return {
		id: produto.id,
		token: tokenDaReferencia(produto.referencia),
	};
}

export async function aplicarVinculoInicialProduto(
	produto: Produto,
	idbancoExplicito: string | null | undefined,
): Promise<Produto> {
	if (idbancoExplicito) {
		await vincularProdutoAoBancoService({
			idproduto: produto.id,
			idusuario: null,
			idbancoimagem: idbancoExplicito,
			confiarEmpresa: true,
		});
	} else if (idbancoExplicito === undefined) {
		const campos = camposVinculoPorEan({
			eanAnterior: null,
			eanNovo: normalizarCodigoBarras(produto.ean),
			eanFoiInformado: true,
			temImagemPropria: false,
			idproduto: produto.id,
			correspondencia: await correspondenciaDoEan(produto.ean),
		});
		if (campos?.idbancoimagem) {
			await definirPonteiroProdutoEmpresa({
				idproduto: produto.id,
				idbancoimagem: campos.idbancoimagem,
				caminhoimagem: campos.caminhoimagem,
			});
		}
	}
	return (await buscarProdutoPorId(produto.id)) ?? produto;
}

export async function sincronizarVinculoNaAtualizacao(params: {
	produto: Produto;
	eanInformado: boolean;
	eanNovo: string | null;
}): Promise<{ idbancoimagem: string | null; caminhoimagem: string | null } | null> {
	const temImagemPropria =
		Boolean(params.produto.imagem?.trim()) ||
		(Boolean(params.produto.caminhoimagem?.trim()) &&
			!params.produto.idbancoimagem) ||
		(await produtoEmpresaTemMidiaPropria(params.produto.id));
	const eanNovo = params.eanInformado
		? normalizarCodigoBarras(params.eanNovo)
		: normalizarCodigoBarras(params.produto.ean);
	return camposVinculoPorEan({
		eanAnterior: normalizarCodigoBarras(params.produto.ean),
		eanNovo,
		eanFoiInformado: params.eanInformado,
		temImagemPropria,
		idproduto: params.produto.id,
		correspondencia: params.eanInformado
			? await correspondenciaDoEan(eanNovo)
			: null,
	});
}

export async function vincularProdutoAoBancoService(params: {
	idproduto: string;
	idusuario: string | null;
	idbancoimagem: string | null;
	confiarEmpresa?: boolean;
}): Promise<Produto> {
	const produto = await buscarProdutoPorId(params.idproduto);
	if (!produto) {
		throw new ErroBancoImagem("Produto não encontrado", 404, "NOT_FOUND");
	}
	if (
		!params.confiarEmpresa &&
		params.idusuario &&
		!(await verificarUsuarioPertenceEmpresa(params.idusuario, produto.idempresa))
	) {
		throw new ErroBancoImagem(
			"Usuário não pertence à empresa do produto",
			403,
			"FORBIDDEN",
		);
	}
	const temPropria =
		Boolean(produto.imagem?.trim()) ||
		(await produtoEmpresaTemMidiaPropria(produto.id)) ||
		(Boolean(produto.caminhoimagem?.trim()) && !produto.idbancoimagem);
	if (params.idbancoimagem && temPropria) {
		throw new ErroBancoImagem(
			"Remova a foto própria do produto para usar a imagem do banco",
			409,
			"IMAGEM_PROPRIA",
		);
	}
	if (!params.idbancoimagem) {
		await definirPonteiroProdutoEmpresa({
			idproduto: produto.id,
			idbancoimagem: null,
			caminhoimagem: temPropria ? produto.caminhoimagem : null,
		});
		const atualizado = await buscarProdutoPorId(produto.id);
		if (!atualizado) {
			throw new ErroBancoImagem("Produto não encontrado", 404, "NOT_FOUND");
		}
		return atualizado;
	}
	const item = await buscarProdutoBancoPorId(params.idbancoimagem);
	if (!item || !item.ativo) {
		throw new ErroBancoImagem(
			"Item do banco de imagens não encontrado",
			404,
			"BANCO_NAO_ENCONTRADO",
		);
	}
	const token = item.chavearmazenamento
		? tokenDaReferencia(item.referencia)
		: null;
	await definirPonteiroProdutoEmpresa({
		idproduto: produto.id,
		idbancoimagem: item.id,
		caminhoimagem: token
			? `/produtos/${produto.id}/imagem?v=${token}`
			: null,
	});
	const atualizado = await buscarProdutoPorId(produto.id);
	if (!atualizado) {
		throw new ErroBancoImagem("Produto não encontrado", 404, "NOT_FOUND");
	}
	return atualizado;
}

export async function desvincularBancoAposFotoPropria(
	idproduto: string,
): Promise<void> {
	const produto = await buscarProdutoPorId(idproduto);
	if (!produto?.idbancoimagem) return;
	await limparPonteiroBancoProduto(idproduto);
}
