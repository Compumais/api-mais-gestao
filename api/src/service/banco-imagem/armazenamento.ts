import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";

const EXTENSOES = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
} as const;

type TipoImagem = keyof typeof EXTENSOES;

function diretorioImagens(): string {
	return (
		process.env.BANCO_IMAGENS_PATH?.trim() ||
		join(process.cwd(), "storage", "banco-imagens")
	);
}

export function tokenDaReferencia(
	referencia: string | null | undefined,
): string | null {
	if (!referencia) return null;
	try {
		return new URL(referencia, "http://local").searchParams.get("v");
	} catch {
		return null;
	}
}

export function referenciaImagemGrupo(id: string, token: string): string {
	return `/banco-imagens/grupos/${id}/imagem?v=${token}`;
}

export function referenciaImagemProdutoBanco(
	id: string,
	token: string,
): string {
	return `/banco-imagens/${id}/imagem?v=${token}`;
}

export function caminhoImagemProdutoEmpresa(
	idproduto: string,
	token: string,
): string {
	return `/produtos/${idproduto}/imagem?v=${token}`;
}

function caminhoArquivo(chave: string): string {
	return join(diretorioImagens(), chave);
}

export async function removerArquivoBanco(
	chave: string | null | undefined,
): Promise<void> {
	if (!chave || chave.includes("..") || chave.includes("/") || chave.includes("\\")) {
		return;
	}
	await rm(caminhoArquivo(chave), { force: true });
}

export async function gravarArquivoBanco(params: {
	id: string;
	conteudo: Buffer;
	tipo: TipoImagem;
}): Promise<{
	token: string;
	chave: string;
	tipo: TipoImagem;
	tamanho: number;
}> {
	const tipo = params.tipo;
	const token = uuidv4();
	const chave = `${params.id}-${token}${EXTENSOES[tipo]}`;
	const destino = caminhoArquivo(chave);
	const temporario = `${destino}.tmp`;
	await mkdir(diretorioImagens(), { recursive: true });
	await writeFile(temporario, params.conteudo, { flag: "wx" });
	await rename(temporario, destino);
	return {
		token,
		chave,
		tipo,
		tamanho: params.conteudo.length,
	};
}

export async function lerArquivoBanco(params: {
	chave: string | null | undefined;
	tipomime: string | null | undefined;
	referencia: string | null | undefined;
	id: string;
}): Promise<{ conteudo: Buffer; tipo: string; etag: string } | null> {
	if (!params.chave) return null;
	try {
		return {
			conteudo: await readFile(caminhoArquivo(params.chave)),
			tipo: params.tipomime ?? "application/octet-stream",
			etag: tokenDaReferencia(params.referencia) ?? params.id,
		};
	} catch (erro) {
		if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
		return null;
	}
}
