export function resolverModeloDocumentoFiscal(
	modelo: string | number | null | undefined,
): 55 | 65 {
	const valor = String(modelo ?? "").replace(/\D/g, "");
	return valor === "65" ? 65 : 55;
}
