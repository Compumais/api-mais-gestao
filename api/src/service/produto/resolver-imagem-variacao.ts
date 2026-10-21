export function resolverImagemVariacao(params: {
	imagem: string | null;
	caminhoimagem: string | null;
	possuiImagemPropria: boolean;
	imagemPai: string | null;
	caminhoimagemPai: string | null;
}): { imagem: string | null; caminhoimagem: string | null } {
	if (params.possuiImagemPropria) {
		return {
			imagem: params.imagem,
			caminhoimagem: params.caminhoimagem,
		};
	}

	const caminhoPai = params.caminhoimagemPai?.trim()
		? params.caminhoimagemPai
		: null;
	const imagemPai = params.imagemPai?.trim() ? params.imagemPai : null;
	if (!caminhoPai && !imagemPai) {
		return {
			imagem: params.imagem,
			caminhoimagem: params.caminhoimagem,
		};
	}

	return {
		imagem: imagemPai,
		caminhoimagem: caminhoPai,
	};
}
