/**
 * Extrai dhRecbto (data/hora de autorização SEFAZ) do XML da NF-e/NFC-e.
 * Retorna o valor original com offset quando válido; null se ausente/inválido.
 */
export function extrairDhRecbtoXml(
	xml: string | null | undefined,
): string | null {
	if (!xml?.trim()) return null;
	const match = xml.match(
		/<(?:[\w.]+:)?dhRecbto(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:[\w.]+:)?dhRecbto>/i,
	);
	const bruto = match?.[1]?.trim();
	if (!bruto) return null;
	const ms = Date.parse(bruto);
	if (!Number.isFinite(ms)) return null;
	return bruto;
}

/** Resolve data/hora de autorização a partir do XML autorizado, com fallback. */
export function resolverDataHoraAutorizacao(params: {
	xmlAutorizado?: string | null;
	fallbackIso?: string | null;
}): string | null {
	return (
		extrairDhRecbtoXml(params.xmlAutorizado) ??
		(params.fallbackIso?.trim() || null)
	);
}
