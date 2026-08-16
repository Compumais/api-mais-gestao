/** Limite de xProd na NFC-e (modelo 65). */
export const DESCRICAO_NFCE_MAX = 120;

/**
 * Descrição comercial de pizza meio a meio.
 * Ordem = escolha do operador (primeiro / segundo sabor), não o preço.
 */
export function montarDescricaoPizzaMeioAMeio(
	primeiro: string,
	segundo: string,
): string {
	const texto = `Pizza meio a meio: ${primeiro.trim()} / ${segundo.trim()}`;
	if (texto.length <= DESCRICAO_NFCE_MAX) {
		return texto;
	}
	return texto.slice(0, DESCRICAO_NFCE_MAX);
}

export function truncarDescricaoItemNfce(descricao: string): string {
	const texto = descricao.trim();
	if (texto.length <= DESCRICAO_NFCE_MAX) {
		return texto;
	}
	return texto.slice(0, DESCRICAO_NFCE_MAX);
}
