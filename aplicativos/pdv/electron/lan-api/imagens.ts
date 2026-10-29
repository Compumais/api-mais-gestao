import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type TipoImagemCatalogo = "produtos" | "grupos-gourmet";

const CACHE_POR_TIPO: Record<TipoImagemCatalogo, string> = {
	produtos: "produto-imagens",
	"grupos-gourmet": "grupo-gourmet-imagens",
};

function texto(valor: unknown): string | null {
	return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function ehReferenciaCacheLocal(valor: unknown): boolean {
	const referencia = texto(valor);
	return Boolean(
		referencia &&
			(referencia.startsWith("pdv-image://") ||
				referencia.startsWith("file://") ||
				/^[a-zA-Z]:[\\/]/.test(referencia)),
	);
}

function versaoReferenciaLocal(valor: unknown): string | null {
	const referencia = texto(valor);
	if (!referencia) return null;
	try {
		const nome = referencia.startsWith("pdv-image://")
			? decodeURIComponent(new URL(referencia).pathname.slice(1))
			: referencia.replaceAll("\\", "/").split("/").at(-1);
		return nome?.replace(/\.[^.]+$/, "") || null;
	} catch {
		return null;
	}
}

export function urlImagemCatalogoLan(
	tipo: TipoImagemCatalogo,
	id: string,
	caminhoLocal: unknown,
	referenciaRemota: unknown,
): string | null {
	const rota = `/pos/imagens/${tipo}/${encodeURIComponent(id)}`;
	if (ehReferenciaCacheLocal(caminhoLocal)) {
		const versao = versaoReferenciaLocal(caminhoLocal);
		return versao ? `${rota}?v=${encodeURIComponent(versao)}` : rota;
	}
	if (texto(caminhoLocal) || texto(referenciaRemota)) {
		return rota;
	}
	return null;
}

export function prepararCatalogoParaLan(catalogo: unknown): unknown {
	if (!catalogo || typeof catalogo !== "object" || Array.isArray(catalogo)) {
		return catalogo;
	}
	const origem = catalogo as Record<string, unknown>;
	const mapear = (tipo: TipoImagemCatalogo, item: unknown): unknown => {
		if (!item || typeof item !== "object" || Array.isArray(item)) return item;
		const registro = item as Record<string, unknown>;
		const id = texto(registro.id);
		if (!id) return item;
		return {
			...registro,
			caminhoimagem: urlImagemCatalogoLan(
				tipo,
				id,
				registro.caminhoimagem,
				registro.imagemremota,
			),
		};
	};
	return {
		...origem,
		produtos: Array.isArray(origem.produtos)
			? origem.produtos.map((item) => mapear("produtos", item))
			: origem.produtos,
		gruposGourmet: Array.isArray(origem.gruposGourmet)
			? origem.gruposGourmet.map((item) => mapear("grupos-gourmet", item))
			: origem.gruposGourmet,
	};
}

function dentroDoDiretorio(caminho: string, diretorio: string): boolean {
	const rel = relative(resolve(diretorio), resolve(caminho));
	return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolverArquivoImagemCatalogo(
	userData: string,
	tipo: TipoImagemCatalogo,
	referencia: string,
): string | null {
	const diretorio = join(userData, CACHE_POR_TIPO[tipo]);
	let caminho: string;
	try {
		if (referencia.startsWith("pdv-image://")) {
			const url = new URL(referencia);
			const hostEsperado = tipo === "produtos" ? "produto" : "grupo-gourmet";
			if (url.hostname !== hostEsperado) return null;
			const nome = decodeURIComponent(url.pathname.slice(1));
			if (!nome || nome.includes("/") || nome.includes("\\")) return null;
			caminho = join(diretorio, nome);
		} else if (referencia.startsWith("file://")) {
			caminho = fileURLToPath(referencia);
		} else if (/^[a-zA-Z]:[\\/]/.test(referencia)) {
			caminho = referencia;
		} else {
			return null;
		}
	} catch {
		return null;
	}

	if (!dentroDoDiretorio(caminho, diretorio)) return null;
	if (
		![".jpg", ".jpeg", ".png", ".webp"].includes(extname(caminho).toLowerCase())
	) {
		return null;
	}
	return caminho;
}
