import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { app, protocol } from "electron";

export const ESQUEMA_IMAGEM_LOCAL = "pdv-image";

type TipoImagemLocal = "produto" | "grupo-gourmet";

const DIRETORIO_POR_TIPO: Record<TipoImagemLocal, string> = {
	produto: "produto-imagens",
	"grupo-gourmet": "grupo-gourmet-imagens",
};

const MIME_POR_EXTENSAO: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

export function urlImagemLocal(
	tipo: TipoImagemLocal,
	nomeArquivo: string,
): string {
	return `${ESQUEMA_IMAGEM_LOCAL}://${tipo}/${encodeURIComponent(nomeArquivo)}`;
}

export function registrarEsquemaImagemLocal(): void {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: ESQUEMA_IMAGEM_LOCAL,
			privileges: {
				standard: true,
				secure: true,
				supportFetchAPI: true,
				corsEnabled: true,
			},
		},
	]);
}

export function registrarProtocoloImagemLocal(): void {
	protocol.handle(ESQUEMA_IMAGEM_LOCAL, async (request) => {
		try {
			const url = new URL(request.url);
			const tipo = url.hostname as TipoImagemLocal;
			const diretorio = DIRETORIO_POR_TIPO[tipo];
			const nomeArquivo = decodeURIComponent(url.pathname.slice(1));

			if (
				!diretorio ||
				!nomeArquivo ||
				nomeArquivo.includes("/") ||
				nomeArquivo.includes("\\")
			) {
				return new Response("Imagem inválida", { status: 400 });
			}

			const tipoMime = MIME_POR_EXTENSAO[extname(nomeArquivo).toLowerCase()];
			if (!tipoMime) {
				return new Response("Formato não suportado", { status: 415 });
			}

			const conteudo = await readFile(
				join(app.getPath("userData"), diretorio, nomeArquivo),
			);
			return new Response(new Uint8Array(conteudo), {
				headers: {
					"Content-Type": tipoMime,
					"Cache-Control": "no-cache",
				},
			});
		} catch {
			return new Response("Imagem não encontrada", { status: 404 });
		}
	});
}
