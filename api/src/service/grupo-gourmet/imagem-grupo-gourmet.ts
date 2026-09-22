import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarGrupoGourmet,
	buscarGrupoGourmetPorId,
} from "@/repositories/grupo-gourmet-repositories.js";
import {
	ErroImagemProduto,
	TAMANHO_MAXIMO_IMAGEM_PRODUTO,
	validarImagemProduto,
} from "@/service/produto/imagem-produto.js";

export const TAMANHO_MAXIMO_IMAGEM_GRUPO_GOURMET =
	TAMANHO_MAXIMO_IMAGEM_PRODUTO;

const EXTENSOES = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
} as const;

function diretorioImagens(): string {
	return (
		process.env.GRUPO_GOURMET_IMAGENS_PATH?.trim() ||
		join(process.cwd(), "storage", "grupos-gourmet")
	);
}

function tokenReferencia(referencia: string | null | undefined): string | null {
	if (!referencia?.startsWith("/grupos-gourmet/")) return null;
	try {
		return new URL(referencia, "http://local").searchParams.get("v");
	} catch {
		return null;
	}
}

function caminhoArquivo(id: string, token: string, extensao: string): string {
	return join(diretorioImagens(), `${id}-${token}${extensao}`);
}

async function obterGrupoAutorizado(id: string, idusuario: string) {
	const grupo = await buscarGrupoGourmetPorId(id);
	if (!grupo)
		throw new ErroImagemProduto(
			"Grupo gourmet não encontrado",
			404,
			"NOT_FOUND",
		);
	if (!(await verificarUsuarioPertenceEmpresa(idusuario, grupo.idempresa))) {
		throw new ErroImagemProduto(
			"Usuário não pertence à empresa do grupo gourmet",
			403,
			"FORBIDDEN",
		);
	}
	return grupo;
}

async function removerArquivoGerenciado(
	id: string,
	referencia: string | null | undefined,
): Promise<void> {
	const token = tokenReferencia(referencia);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return;
	await Promise.all(
		Object.values(EXTENSOES).map((extensao) =>
			rm(caminhoArquivo(id, token, extensao), { force: true }),
		),
	);
}

export async function salvarImagemGrupoGourmet(params: {
	id: string;
	idusuario: string;
	conteudo: Buffer;
	tipoInformado: string | undefined;
}) {
	const grupo = await obterGrupoAutorizado(params.id, params.idusuario);
	const tipo = validarImagemProduto(params.conteudo, params.tipoInformado);
	const token = uuidv4();
	const extensao = EXTENSOES[tipo];
	const destino = caminhoArquivo(params.id, token, extensao);
	await mkdir(diretorioImagens(), { recursive: true });
	await writeFile(`${destino}.tmp`, params.conteudo, { flag: "wx" });
	await rename(`${destino}.tmp`, destino);
	const referencia = `/grupos-gourmet/${params.id}/imagem?v=${token}`;
	const atualizado = await atualizarGrupoGourmet(params.id, {
		caminhoimagem: referencia,
	});
	if (!atualizado) {
		await rm(destino, { force: true });
		throw new ErroImagemProduto(
			"Não foi possível vincular a imagem",
			500,
			"IMAGEM_NAO_VINCULADA",
		);
	}
	await removerArquivoGerenciado(params.id, grupo.caminhoimagem);
	return atualizado;
}

export async function removerImagemGrupoGourmet(params: {
	id: string;
	idusuario: string;
}) {
	const grupo = await obterGrupoAutorizado(params.id, params.idusuario);
	const atualizado = await atualizarGrupoGourmet(params.id, {
		caminhoimagem: null,
	});
	if (!atualizado) {
		throw new ErroImagemProduto(
			"Não foi possível remover a imagem",
			500,
			"IMAGEM_NAO_REMOVIDA",
		);
	}
	await removerArquivoGerenciado(params.id, grupo.caminhoimagem);
	return atualizado;
}

export async function lerImagemGrupoGourmet(params: {
	id: string;
	idusuario: string;
}) {
	const grupo = await obterGrupoAutorizado(params.id, params.idusuario);
	const token = tokenReferencia(grupo.caminhoimagem);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
		throw new ErroImagemProduto(
			"Imagem não encontrada",
			404,
			"IMAGEM_NAO_ENCONTRADA",
		);
	}
	for (const [tipo, extensao] of Object.entries(EXTENSOES)) {
		try {
			return {
				conteudo: await readFile(caminhoArquivo(params.id, token, extensao)),
				tipo,
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

export async function lerImagemGrupoGourmetDaEmpresa(params: {
	id: string;
	idempresa: string;
}) {
	const grupo = await buscarGrupoGourmetPorId(params.id);
	if (!grupo || grupo.idempresa !== params.idempresa) {
		throw new ErroImagemProduto(
			"Imagem não encontrada",
			404,
			"IMAGEM_NAO_ENCONTRADA",
		);
	}
	const token = tokenReferencia(grupo.caminhoimagem);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
		throw new ErroImagemProduto(
			"Imagem não encontrada",
			404,
			"IMAGEM_NAO_ENCONTRADA",
		);
	}
	for (const [tipo, extensao] of Object.entries(EXTENSOES)) {
		try {
			return {
				conteudo: await readFile(caminhoArquivo(params.id, token, extensao)),
				tipo,
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
