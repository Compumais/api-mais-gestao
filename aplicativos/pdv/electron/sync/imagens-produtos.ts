import {
	access,
	mkdir,
	readdir,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { app } from "electron";
import { baixarImagemProduto } from "../api/client";
import { urlImagemLocal } from "./protocolo-imagens";

type ProdutoComImagem = {
	id: string;
	imagem?: string | null;
	caminhoimagem?: string | null;
	imagemurl?: string | null;
};

const EXTENSAO_POR_TIPO: Record<string, string> = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
};

function diretorioCache(): string {
	return join(app.getPath("userData"), "produto-imagens");
}

function tokenDaReferencia(referencia: string): string | null {
	try {
		const token = new URL(referencia, "http://local").searchParams.get("v");
		return token && /^[0-9a-f-]{36}$/i.test(token) ? token : null;
	} catch {
		return null;
	}
}

async function removerVersoesAnteriores(
	idproduto: string,
	manter?: string,
): Promise<void> {
	await mkdir(diretorioCache(), { recursive: true });
	const prefixo = `${idproduto}-`;
	const arquivos = await readdir(diretorioCache());
	await Promise.all(
		arquivos
			.filter((arquivo) => arquivo.startsWith(prefixo) && arquivo !== manter)
			.map((arquivo) => rm(join(diretorioCache(), arquivo), { force: true })),
	);
}

async function arquivoExistente(
	idproduto: string,
	token: string,
): Promise<string | null> {
	for (const extensao of Object.values(EXTENSAO_POR_TIPO)) {
		const nome = `${idproduto}-${token}${extensao}`;
		try {
			await access(join(diretorioCache(), nome));
			return nome;
		} catch {
			// tenta a próxima extensão
		}
	}
	return null;
}

async function referenciaCacheExistente(
	idproduto: string,
): Promise<string | null> {
	try {
		const prefixo = `${idproduto}-`;
		const arquivo = (await readdir(diretorioCache())).find((nome) =>
			nome.startsWith(prefixo),
		);
		return arquivo ? urlImagemLocal("produto", arquivo) : null;
	} catch {
		return null;
	}
}

export async function sincronizarImagemProduto<T extends ProdutoComImagem>(
	produto: T,
): Promise<T & { imagemremota: string | null }> {
	const referencia = produto.imagemurl ?? null;
	if (!referencia) {
		await removerVersoesAnteriores(produto.id);
		return { ...produto, imagemremota: null };
	}

	const token = tokenDaReferencia(referencia);
	if (!token) return { ...produto, imagemremota: referencia };
	await mkdir(diretorioCache(), { recursive: true });

	let nomeArquivo = await arquivoExistente(produto.id, token);
	if (!nomeArquivo) {
		const imagem = await baixarImagemProduto(referencia);
		const extensao = EXTENSAO_POR_TIPO[imagem.tipo];
		if (!extensao) throw new Error("Formato de imagem não suportado no PDV");
		nomeArquivo = `${produto.id}-${token}${extensao}`;
		const destino = join(diretorioCache(), nomeArquivo);
		await writeFile(`${destino}.tmp`, imagem.conteudo);
		await rm(destino, { force: true });
		await rename(`${destino}.tmp`, destino);
	}

	await removerVersoesAnteriores(produto.id, nomeArquivo);
	return {
		...produto,
		caminhoimagem: urlImagemLocal("produto", nomeArquivo),
		imagemremota: referencia,
	};
}

export async function sincronizarImagensProdutos<T extends ProdutoComImagem>(
	produtos: T[],
): Promise<Array<T & { imagemremota: string | null }>> {
	const resultado: Array<T & { imagemremota: string | null }> = [];
	for (const produto of produtos) {
		try {
			resultado.push(await sincronizarImagemProduto(produto));
		} catch {
			// Não bloqueia a carga fiscal/comercial por indisponibilidade da mídia.
			const cacheAnterior = await referenciaCacheExistente(produto.id);
			resultado.push({
				...produto,
				caminhoimagem: cacheAnterior ?? produto.caminhoimagem ?? null,
				imagemremota: produto.imagemurl ?? null,
			});
		}
	}
	return resultado;
}
