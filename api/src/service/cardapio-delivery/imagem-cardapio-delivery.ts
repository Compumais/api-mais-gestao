import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
	atualizarCardapioDelivery,
	buscarCardapioDeliveryPorEmpresa,
	buscarCardapioDeliveryPorSlug,
} from "@/repositories/cardapio-delivery-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	ErroImagemProduto,
	TAMANHO_MAXIMO_IMAGEM_PRODUTO,
	validarImagemProduto,
} from "@/service/produto/imagem-produto.js";

const EXTENSOES = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
} as const;

type TipoImagem = "logo" | "banner";

function diretorioImagens(): string {
	return (
		process.env.CARDAPIO_DELIVERY_IMAGENS_PATH?.trim() ||
		join(process.cwd(), "storage", "cardapio-delivery")
	);
}

function tokenReferencia(referencia: string | null | undefined): string | null {
	if (!referencia) return null;
	try {
		return new URL(referencia, "http://local").searchParams.get("v");
	} catch {
		return null;
	}
}

function caminhoArquivo(
	id: string,
	tipo: TipoImagem,
	token: string,
	extensao: string,
): string {
	return join(diretorioImagens(), `${id}-${tipo}-${token}${extensao}`);
}

async function removerArquivo(
	id: string,
	tipo: TipoImagem,
	referencia: string | null | undefined,
) {
	const token = tokenReferencia(referencia);
	if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return;
	await Promise.all(
		Object.values(EXTENSOES).map((extensao) =>
			rm(caminhoArquivo(id, tipo, token, extensao), { force: true }),
		),
	);
}

async function obterCardapioAutorizado(idempresa: string, idusuario: string) {
	if (!(await verificarUsuarioPertenceEmpresa(idusuario, idempresa))) {
		throw new ErroImagemProduto(
			"Usuário não pertence à empresa",
			403,
			"FORBIDDEN",
		);
	}
	const cardapio = await buscarCardapioDeliveryPorEmpresa(idempresa);
	if (!cardapio) {
		throw new ErroImagemProduto("Cardápio não encontrado", 404, "NOT_FOUND");
	}
	return cardapio;
}

export async function salvarImagemCardapioDelivery(params: {
	idempresa: string;
	idusuario: string;
	tipo: TipoImagem;
	conteudo: Buffer;
	tipoInformado: string | undefined;
}) {
	const cardapio = await obterCardapioAutorizado(
		params.idempresa,
		params.idusuario,
	);
	const tipoMime = validarImagemProduto(params.conteudo, params.tipoInformado);
	const token = uuidv4();
	const extensao = EXTENSOES[tipoMime];
	const destino = caminhoArquivo(cardapio.id, params.tipo, token, extensao);
	await mkdir(diretorioImagens(), { recursive: true });
	await writeFile(`${destino}.tmp`, params.conteudo, { flag: "wx" });
	await rename(`${destino}.tmp`, destino);
	const referencia = `/publico/cardapio/${cardapio.slug}/${params.tipo}?v=${token}`;
	const campo = params.tipo === "logo" ? "logourl" : "bannerurl";
	const atualizado = await atualizarCardapioDelivery(cardapio.id, {
		[campo]: referencia,
		atualizadoem: new Date().toISOString(),
	});
	if (!atualizado) {
		await rm(destino, { force: true });
		throw new ErroImagemProduto(
			"Não foi possível vincular a imagem",
			500,
			"IMAGEM_NAO_VINCULADA",
		);
	}
	await removerArquivo(
		cardapio.id,
		params.tipo,
		params.tipo === "logo" ? cardapio.logourl : cardapio.bannerurl,
	);
	return atualizado;
}

export async function removerImagemCardapioDelivery(params: {
	idempresa: string;
	idusuario: string;
	tipo: TipoImagem;
}) {
	const cardapio = await obterCardapioAutorizado(
		params.idempresa,
		params.idusuario,
	);
	const campo = params.tipo === "logo" ? "logourl" : "bannerurl";
	const atualizado = await atualizarCardapioDelivery(cardapio.id, {
		[campo]: null,
		atualizadoem: new Date().toISOString(),
	});
	if (!atualizado) {
		throw new ErroImagemProduto(
			"Não foi possível remover a imagem",
			500,
			"IMAGEM_NAO_REMOVIDA",
		);
	}
	await removerArquivo(
		cardapio.id,
		params.tipo,
		params.tipo === "logo" ? cardapio.logourl : cardapio.bannerurl,
	);
	return atualizado;
}

export async function lerImagemCardapioPublica(params: {
	slug: string;
	tipo: TipoImagem;
}) {
	const cardapio = await buscarCardapioDeliveryPorSlug(params.slug);
	if (!cardapio || cardapio.ativo !== 1) {
		throw new ErroImagemProduto("Imagem não encontrada", 404, "NOT_FOUND");
	}
	const referencia =
		params.tipo === "logo" ? cardapio.logourl : cardapio.bannerurl;
	const token = tokenReferencia(referencia);
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
				conteudo: await readFile(
					caminhoArquivo(cardapio.id, params.tipo, token, extensao),
				),
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
