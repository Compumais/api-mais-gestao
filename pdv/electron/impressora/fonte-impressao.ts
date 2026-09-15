/** Tamanho tipográfico dos cupons térmicos de texto (ESC/POS e HTML). */
export type TamanhoFonteImpressao = "pequena" | "media" | "grande";

export function normalizarTamanhoFonte(
	raw?: string | null,
): TamanhoFonteImpressao {
	const v = (raw ?? "").trim().toLowerCase();
	if (v === "pequena" || v === "grande") return v;
	return "media";
}

/** Um degrau menor — cupom único de produção (mais conteúdo na bobina). */
export function reduzirTamanhoFonte(
	tamanho: TamanhoFonteImpressao,
): TamanhoFonteImpressao {
	if (tamanho === "grande") return "media";
	return "pequena";
}

export function largurasLinhaCupom(tamanho: TamanhoFonteImpressao): {
	desc: number;
	obs: number;
	linha: number;
} {
	if (tamanho === "pequena") return { desc: 28, obs: 26, linha: 30 };
	if (tamanho === "grande") return { desc: 16, obs: 14, linha: 16 };
	return { desc: 30, obs: 28, linha: 32 };
}

export function estiloHtmlFonte(tamanho: TamanhoFonteImpressao): {
	fontSize: string;
	lineHeight: string;
} {
	if (tamanho === "pequena") return { fontSize: "11pt", lineHeight: "1.15" };
	if (tamanho === "grande") return { fontSize: "20pt", lineHeight: "1.25" };
	return { fontSize: "15pt", lineHeight: "1.3" };
}
