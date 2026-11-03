export type EventoCancelamentoConsultaNfe = {
	xml: string;
	justificativa: string | null;
	protocolo: string | null;
};

function textoTag(bloco: string, tag: string): string | null {
	const match = bloco.match(
		new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "i"),
	);
	const texto = match?.[1]?.trim();
	return texto ? texto : null;
}

export function extrairEventoCancelamentoConsultaNfe(
	xml?: string | null,
): EventoCancelamentoConsultaNfe | null {
	if (!xml?.trim()) return null;

	const blocos =
		xml.match(
			/<(?:\w+:)?procEventoNFe\b[^>]*>[\s\S]*?<\/(?:\w+:)?procEventoNFe>/gi,
		) ?? [];
	const cancelamento = blocos.find(
		(bloco) => textoTag(bloco, "tpEvento") === "110111",
	);
	if (!cancelamento) return null;

	return {
		xml: cancelamento,
		justificativa: textoTag(cancelamento, "xJust"),
		protocolo: textoTag(cancelamento, "nProt"),
	};
}
