export type QrCodeNfceXml = {
	qrCode: string | null;
	urlChave: string | null;
};

function extrairConteudoTag(xml: string, tag: string): string | null {
	const regex = new RegExp(
		`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
		"i",
	);
	const match = xml.match(regex);
	if (!match?.[1]) return null;

	return match[1].trim() || null;
}

export function extrairQrCodeNfceXml(xml: string | null | undefined): QrCodeNfceXml {
	if (!xml?.trim()) {
		return { qrCode: null, urlChave: null };
	}

	const qrCode = extrairConteudoTag(xml, "qrCode");
	const urlChave = extrairConteudoTag(xml, "urlChave");

	return {
		qrCode,
		urlChave: urlChave ?? (qrCode ? qrCode.split("?")[0] ?? null : null),
	};
}
