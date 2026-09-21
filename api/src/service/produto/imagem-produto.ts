import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarImagemProdutoPorId,
	criarImagemProduto,
	definirImagemPrincipal,
	excluirImagemProduto,
	listarImagensProduto,
	proximaOrdemImagemProduto,
} from "@/repositories/produto-imagem-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";

export const TAMANHO_MAXIMO_IMAGEM_PRODUTO = 5 * 1024 * 1024;
export const TIPOS_IMAGEM_PRODUTO = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

type TipoImagemProduto = (typeof TIPOS_IMAGEM_PRODUTO)[number];

const EXTENSOES: Record<TipoImagemProduto, string> = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
};

const TIPOS_POR_EXTENSAO: Record<string, TipoImagemProduto> = {
	".jpg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

export class ErroImagemProduto extends Error {
	constructor(
		mensagem: string,
		public readonly status: number,
		public readonly codigo: string,
	) {
		super(mensagem);
		this.name = "ErroImagemProduto";
	}
}

function diretorioImagens(): string {
	return (
		process.env.PRODUTO_IMAGENS_PATH?.trim() ||
		join(process.cwd(), "storage", "produtos")
	);
}

function tipoPeloConteudo(buffer: Buffer): TipoImagemProduto | null {
	if (
		buffer.length >= 3 &&
		buffer[0] === 0xff &&
		buffer[1] === 0xd8 &&
		buffer[2] === 0xff
	) {
		return "image/jpeg";
	}
	if (
		buffer.length >= 8 &&
		buffer
			.subarray(0, 8)
			.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	) {
		return "image/png";
	}
	if (
		buffer.length >= 12 &&
		buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
		buffer.subarray(8, 12).toString("ascii") === "WEBP"
	) {
		return "image/webp";
	}
	return null;
}

export function validarImagemProduto(
	conteudo: Buffer,
	tipoInformado: string | undefined,
): TipoImagemProduto {
	if (
		conteudo.length === 0 ||
		conteudo.length > TAMANHO_MAXIMO_IMAGEM_PRODUTO
	) {
		throw new ErroImagemProduto(
			"A imagem deve ter no máximo 5 MB",
			413,
			"IMAGEM_TAMANHO_INVALIDO",
		);
	}
	const tipoDetectado = tipoPeloConteudo(conteudo);
	if (
		!tipoDetectado ||
		!TIPOS_IMAGEM_PRODUTO.includes(tipoInformado as TipoImagemProduto) ||
		tipoDetectado !== tipoInformado
	) {
		throw new ErroImagemProduto(
			"Formato inválido. Use JPEG, PNG ou WebP",
			415,
			"IMAGEM_TIPO_INVALIDO",
		);
	}
	return tipoDetectado;
}

function tokenReferencia(caminho: string | null | undefined): string | null {
	if (!caminho?.startsWith("/produtos/")) return null;
	try {
		const url = new URL(caminho, "http://local");
		return url.searchParams.get("v");
	} catch {
		return null;
	}
}

function caminhoArquivoLegado(
	idproduto: string,
	token: string,
	extensao: string,
) {
	return join(diretorioImagens(), `${idproduto}-${token}${extensao}`);
}

function caminhoArquivo(chave: string) {
	return join(diretorioImagens(), chave);
}

async function obterProdutoAutorizado(idproduto: string, idusuario: string) {
	const produto = await buscarProdutoPorId(idproduto);
	if (!produto) {
		throw new ErroImagemProduto("Produto não encontrado", 404, "NOT_FOUND");
	}
	if (!(await verificarUsuarioPertenceEmpresa(idusuario, produto.idempresa))) {
		throw new ErroImagemProduto(
			"Usuário não pertence à empresa do produto",
			403,
			"FORBIDDEN",
		);
	}
	return produto;
}

async function removerArquivoGerenciadoLegado(
	idproduto: string,
	referencia: string | null | undefined,
) {
	const token = tokenReferencia(referencia);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return;
	await Promise.all(
		Object.values(EXTENSOES).map((extensao) =>
			rm(caminhoArquivoLegado(idproduto, token, extensao), { force: true }),
		),
	);
}

async function lerArquivoLegado(
	idproduto: string,
	referencia: string | null | undefined,
) {
	const token = tokenReferencia(referencia);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
	for (const extensao of Object.values(EXTENSOES)) {
		try {
			return {
				conteudo: await readFile(
					caminhoArquivoLegado(idproduto, token, extensao),
				),
				tipo: TIPOS_POR_EXTENSAO[extensao] ?? "application/octet-stream",
				etag: token,
			};
		} catch (erro) {
			if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
		}
	}
	return null;
}

function sanitizarNomeArquivo(nome: string | undefined): string | null {
	if (!nome) return null;
	return (
		basename(nome)
			.replace(/[^\p{L}\p{N}._ -]/gu, "_")
			.slice(0, 255) || null
	);
}

export async function listarGaleriaProduto(params: {
	idproduto: string;
	idusuario: string;
}) {
	await obterProdutoAutorizado(params.idproduto, params.idusuario);
	return listarImagensProduto(params.idproduto);
}

export async function salvarImagemProduto(params: {
	idproduto: string;
	idusuario: string;
	conteudo: Buffer;
	tipoInformado: string | undefined;
	nomeArquivo?: string | undefined;
	tornarPrincipal?: boolean | undefined;
	ip?: string;
}) {
	const produto = await obterProdutoAutorizado(
		params.idproduto,
		params.idusuario,
	);
	const tipoDetectado = validarImagemProduto(
		params.conteudo,
		params.tipoInformado,
	);

	const token = uuidv4();
	const idimagem = uuidv4();
	const extensao = EXTENSOES[tipoDetectado];
	const chave = `${params.idproduto}/${idimagem}-${token}${extensao}`;
	const destino = caminhoArquivo(chave);
	const temporario = `${destino}.tmp`;
	await mkdir(dirname(destino), { recursive: true });
	await writeFile(temporario, params.conteudo, { flag: "wx" });
	await rename(temporario, destino);

	const existentes = await listarImagensProduto(params.idproduto);
	const tornarPrincipal =
		params.tornarPrincipal === true ||
		!existentes.some((imagem) => imagem.principal);
	const referencia = `/produtos/${params.idproduto}/imagens/${idimagem}/arquivo?v=${token}`;
	const criada = await criarImagemProduto(
		{
			id: idimagem,
			idproduto: params.idproduto,
			idempresa: produto.idempresa,
			ordem: await proximaOrdemImagemProduto(params.idproduto),
			principal: tornarPrincipal,
			nomearquivo: sanitizarNomeArquivo(params.nomeArquivo),
			tipomime: tipoDetectado,
			tamanho: params.conteudo.length,
			referencia,
			chavearmazenamento: chave,
			origem: "gerenciada",
		},
		tornarPrincipal,
	);
	if (!criada) {
		await rm(destino, { force: true });
		throw new ErroImagemProduto(
			"Não foi possível vincular a imagem ao produto",
			500,
			"IMAGEM_NAO_VINCULADA",
		);
	}
	return criada;
}

export async function salvarImagemPrincipalProduto(
	params: Parameters<typeof salvarImagemProduto>[0],
) {
	await salvarImagemProduto({ ...params, tornarPrincipal: true });
	const produto = await buscarProdutoPorId(params.idproduto);
	if (!produto) {
		throw new ErroImagemProduto(
			"Produto não encontrado após vincular a imagem",
			404,
			"NOT_FOUND",
		);
	}
	return produto;
}

export async function tornarImagemPrincipal(params: {
	idproduto: string;
	idimagem: string;
	idusuario: string;
}) {
	await obterProdutoAutorizado(params.idproduto, params.idusuario);
	const imagem = await definirImagemPrincipal(
		params.idproduto,
		params.idimagem,
	);
	if (!imagem) {
		throw new ErroImagemProduto("Imagem não encontrada", 404, "NOT_FOUND");
	}
	return imagem;
}

export async function removerImagemGaleriaProduto(params: {
	idproduto: string;
	idimagem: string;
	idusuario: string;
}) {
	await obterProdutoAutorizado(params.idproduto, params.idusuario);
	const resultado = await excluirImagemProduto(
		params.idproduto,
		params.idimagem,
	);
	if (!resultado) {
		throw new ErroImagemProduto("Imagem não encontrada", 404, "NOT_FOUND");
	}
	if (resultado.removida.chavearmazenamento) {
		await rm(caminhoArquivo(resultado.removida.chavearmazenamento), {
			force: true,
		});
	} else if (resultado.removida.origem === "legada") {
		await removerArquivoGerenciadoLegado(
			params.idproduto,
			resultado.removida.referencia,
		);
	}
	return resultado;
}

export async function removerImagemProduto(params: {
	idproduto: string;
	idusuario: string;
	ip?: string;
}) {
	await obterProdutoAutorizado(params.idproduto, params.idusuario);
	const imagens = await listarImagensProduto(params.idproduto);
	const principal = imagens.find((imagem) => imagem.principal);
	if (!principal) {
		throw new ErroImagemProduto("Imagem não encontrada", 404, "NOT_FOUND");
	}
	await removerImagemGaleriaProduto({
		idproduto: params.idproduto,
		idimagem: principal.id,
		idusuario: params.idusuario,
	});
	return buscarProdutoPorId(params.idproduto);
}

export async function lerArquivoImagemProduto(params: {
	idproduto: string;
	idimagem: string;
	idusuario: string;
}) {
	const produto = await obterProdutoAutorizado(
		params.idproduto,
		params.idusuario,
	);
	const imagem = await buscarImagemProdutoPorId(
		params.idproduto,
		params.idimagem,
	);
	if (!imagem) {
		throw new ErroImagemProduto(
			"Imagem não encontrada",
			404,
			"IMAGEM_NAO_ENCONTRADA",
		);
	}
	if (imagem.chavearmazenamento) {
		try {
			return {
				conteudo: await readFile(caminhoArquivo(imagem.chavearmazenamento)),
				tipo: imagem.tipomime ?? "application/octet-stream",
				etag: tokenReferencia(imagem.referencia) ?? imagem.id,
			};
		} catch (erro) {
			if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
		}
	}
	const legado = await lerArquivoLegado(params.idproduto, imagem.referencia);
	if (legado) return legado;
	if (imagem.origem === "legada" && produto.imagem) {
		const texto = produto.imagem.replace(/^data:image\/[^;]+;base64,/, "");
		return {
			conteudo: Buffer.from(texto, "base64"),
			tipo: produto.imagem.startsWith("data:image/png")
				? "image/png"
				: produto.imagem.startsWith("data:image/webp")
					? "image/webp"
					: "image/jpeg",
			etag: imagem.id,
		};
	}
	throw new ErroImagemProduto(
		"Imagem não encontrada",
		404,
		"IMAGEM_NAO_ENCONTRADA",
	);
}

export async function lerImagemProduto(params: {
	idproduto: string;
	idusuario: string;
}) {
	const produto = await obterProdutoAutorizado(
		params.idproduto,
		params.idusuario,
	);
	const imagens = await listarImagensProduto(params.idproduto);
	const principal = imagens.find((imagem) => imagem.principal);
	if (principal) {
		return lerArquivoImagemProduto({
			...params,
			idimagem: principal.id,
		});
	}
	const legado = await lerArquivoLegado(
		params.idproduto,
		produto.caminhoimagem,
	);
	if (legado) return legado;
	throw new ErroImagemProduto(
		"Imagem não encontrada",
		404,
		"IMAGEM_NAO_ENCONTRADA",
	);
}

export async function lerImagemProdutoDaEmpresa(params: {
	idproduto: string;
	idempresa: string;
}) {
	const produto = await buscarProdutoPorId(params.idproduto);
	if (!produto || produto.idempresa !== params.idempresa) {
		throw new ErroImagemProduto(
			"Imagem não encontrada",
			404,
			"IMAGEM_NAO_ENCONTRADA",
		);
	}
	const imagens = await listarImagensProduto(params.idproduto);
	const principal = imagens.find((imagem) => imagem.principal) ?? imagens[0];
	if (principal?.chavearmazenamento) {
		try {
			return {
				conteudo: await readFile(caminhoArquivo(principal.chavearmazenamento)),
				tipo: principal.tipomime ?? "application/octet-stream",
				etag: tokenReferencia(principal.referencia) ?? principal.id,
			};
		} catch (erro) {
			if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
		}
	}
	const legado = await lerArquivoLegado(
		params.idproduto,
		principal?.referencia ?? produto.caminhoimagem,
	);
	if (legado) return legado;
	throw new ErroImagemProduto(
		"Imagem não encontrada",
		404,
		"IMAGEM_NAO_ENCONTRADA",
	);
}

