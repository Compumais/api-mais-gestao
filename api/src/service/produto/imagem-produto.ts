import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { atualizarProdutoService } from "./atualizar-produto.js";

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

function caminhoArquivo(idproduto: string, token: string, extensao: string) {
	return join(diretorioImagens(), `${idproduto}-${token}${extensao}`);
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

async function removerArquivoGerenciado(
	idproduto: string,
	referencia: string | null | undefined,
) {
	const token = tokenReferencia(referencia);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return;
	await Promise.all(
		Object.values(EXTENSOES).map((extensao) =>
			rm(caminhoArquivo(idproduto, token, extensao), { force: true }),
		),
	);
}

export async function salvarImagemProduto(params: {
	idproduto: string;
	idusuario: string;
	conteudo: Buffer;
	tipoInformado: string | undefined;
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
	const extensao = EXTENSOES[tipoDetectado];
	const diretorio = diretorioImagens();
	const destino = caminhoArquivo(params.idproduto, token, extensao);
	const temporario = `${destino}.tmp`;
	await mkdir(diretorio, { recursive: true });
	await writeFile(temporario, params.conteudo, { flag: "wx" });
	await rename(temporario, destino);

	const referencia = `/produtos/${params.idproduto}/imagem?v=${token}`;
	const resultado = await atualizarProdutoService({
		produtoId: params.idproduto,
		idusuario: params.idusuario,
		dados: { caminhoimagem: referencia, imagem: null },
		ip: params.ip,
	});
	if (!resultado.success || !resultado.body) {
		await rm(destino, { force: true });
		throw new ErroImagemProduto(
			"Não foi possível vincular a imagem ao produto",
			resultado.status,
			"IMAGEM_NAO_VINCULADA",
		);
	}

	await removerArquivoGerenciado(params.idproduto, produto.caminhoimagem);
	return resultado.body;
}

export async function removerImagemProduto(params: {
	idproduto: string;
	idusuario: string;
	ip?: string;
}) {
	const produto = await obterProdutoAutorizado(
		params.idproduto,
		params.idusuario,
	);
	const resultado = await atualizarProdutoService({
		produtoId: params.idproduto,
		idusuario: params.idusuario,
		dados: { caminhoimagem: null, imagem: null },
		ip: params.ip,
	});
	if (!resultado.success || !resultado.body) {
		throw new ErroImagemProduto(
			"Não foi possível remover a imagem do produto",
			resultado.status,
			"IMAGEM_NAO_REMOVIDA",
		);
	}
	await removerArquivoGerenciado(params.idproduto, produto.caminhoimagem);
	return resultado.body;
}

export async function lerImagemProduto(params: {
	idproduto: string;
	idusuario: string;
}) {
	const produto = await obterProdutoAutorizado(
		params.idproduto,
		params.idusuario,
	);
	const token = tokenReferencia(produto.caminhoimagem);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
		throw new ErroImagemProduto(
			"Imagem não encontrada",
			404,
			"IMAGEM_NAO_ENCONTRADA",
		);
	}

	for (const extensao of Object.values(EXTENSOES)) {
		try {
			const conteudo = await readFile(
				caminhoArquivo(params.idproduto, token, extensao),
			);
			return {
				conteudo,
				tipo: TIPOS_POR_EXTENSAO[extensao] ?? "application/octet-stream",
				etag: token,
			};
		} catch (erro) {
			if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
		}
	}
	throw new ErroImagemProduto(
		"Imagem não encontrada",
		404,
		"IMAGEM_NAO_ENCONTRADA",
	);
}
