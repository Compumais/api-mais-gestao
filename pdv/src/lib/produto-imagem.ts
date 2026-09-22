/** Resolve src de imagem do produto (mesma regra do POS Android). */

function urlCacheProduto(referencia: string): string | null {
	const caminho = referencia.replaceAll("\\", "/").split(/[?#]/, 1)[0];
	const match = caminho.match(/\/produto-imagens\/([^/]+)$/i);
	if (!match) return null;

	try {
		return `pdv-image://produto/${encodeURIComponent(decodeURIComponent(match[1]))}`;
	} catch {
		return null;
	}
}

function primeiraUrl(
	...candidatos: Array<string | null | undefined>
): string | null {
	for (const c of candidatos) {
		if (!c) continue;
		const v = c.trim();
		if (!v) continue;
		const cacheProduto = urlCacheProduto(v);
		if (cacheProduto) return cacheProduto;
		if (/^[a-zA-Z]:[\\/]/.test(v)) {
			return encodeURI(`file:///${v.replaceAll("\\", "/")}`);
		}
		if (v.startsWith("\\\\")) {
			return encodeURI(`file:${v.replaceAll("\\", "/")}`);
		}
		if (
			v.startsWith("http://") ||
			v.startsWith("https://") ||
			v.startsWith("file://") ||
			v.startsWith("pdv-image://")
		) {
			return v;
		}
		if (v.startsWith("/") && !v.startsWith("//")) {
			return v;
		}
	}
	return null;
}

function normalizarDataUri(imagem: string | null | undefined): string | null {
	if (!imagem) return null;
	const v = imagem.trim();
	if (!v) return null;
	if (v.startsWith("data:image")) return v;
	// base64 puro legado
	if (v.length > 100 && !v.includes("://") && /^[A-Za-z0-9+/=\s]+$/.test(v)) {
		return `data:image/jpeg;base64,${v.replace(/\s/g, "")}`;
	}
	return null;
}

export function resolverSrcImagemProduto(produto: {
	imagem?: string | null;
	caminhoimagem?: string | null;
}): string | null {
	const dataUri = normalizarDataUri(produto.imagem);
	if (dataUri) return dataUri;
	return primeiraUrl(produto.caminhoimagem, produto.imagem);
}
