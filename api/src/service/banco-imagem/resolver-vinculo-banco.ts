export function camposVinculoPorEan(params: {
	eanAnterior: string | null;
	eanNovo: string | null;
	eanFoiInformado: boolean;
	temImagemPropria: boolean;
	idproduto: string;
	correspondencia: { id: string; token: string | null } | null;
}): { idbancoimagem: string | null; caminhoimagem: string | null } | null {
	if (!params.eanFoiInformado) return null;
	if (params.eanAnterior === params.eanNovo) return null;
	if (params.temImagemPropria) return null;
	if (!params.correspondencia) {
		return { idbancoimagem: null, caminhoimagem: null };
	}
	return {
		idbancoimagem: params.correspondencia.id,
		caminhoimagem: params.correspondencia.token
			? `/produtos/${params.idproduto}/imagem?v=${params.correspondencia.token}`
			: null,
	};
}
