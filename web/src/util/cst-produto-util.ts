export function formatarCstProduto(
	valor?: string | number | null,
	tamanho = 2,
): string {
	if (valor === null || valor === undefined || valor === "") {
		return "";
	}

	const digitos = String(valor).replace(/\D/g, "");
	if (!digitos) return "";

	return digitos.padStart(tamanho, "0").slice(-tamanho);
}
