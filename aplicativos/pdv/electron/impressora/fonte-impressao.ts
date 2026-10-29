/** Tamanho tipográfico dos cupons térmicos de texto (ESC/POS e HTML). */
export type TamanhoFonteImpressao = "pequena" | "media" | "grande";

export function normalizarTamanhoFonte(
	raw?: string | null,
): TamanhoFonteImpressao {
	const v = (raw ?? "").trim().toLowerCase();
	if (v === "pequena" || v === "grande") return v;
	return "media";
}

export function largurasLinhaCupom(tamanho: TamanhoFonteImpressao): {
	desc: number;
	obs: number;
	linha: number;
} {
	if (tamanho === "pequena") return { desc: 40, obs: 38, linha: 42 };
	if (tamanho === "grande") return { desc: 16, obs: 14, linha: 16 };
	return { desc: 30, obs: 28, linha: 32 };
}

/**
 * Ajusta cupons textuais à largura física suportada pelo comando ESC/POS.
 * O DANFC-e não passa por esta função e preserva seu leiaute fiscal próprio.
 */
export function ajustarTextoAoTamanhoFonte(
	texto: string,
	tamanhoRaw?: string | null,
): string {
	const tamanho = normalizarTamanhoFonte(tamanhoRaw);
	const largura = largurasLinhaCupom(tamanho).linha;
	const saida: string[] = [];

	for (const linha of texto.split("\n")) {
		if (linha.length <= largura) {
			saida.push(linha);
			continue;
		}
		if (/^=+$/.test(linha) || /^-+$/.test(linha)) {
			saida.push(linha[0]?.repeat(largura) ?? "");
			continue;
		}

		let restante = linha.trim();
		while (restante.length > largura) {
			let corte = restante.lastIndexOf(" ", largura);
			if (corte <= 0) corte = largura;
			saida.push(restante.slice(0, corte).trimEnd());
			restante = restante.slice(corte).trimStart();
		}
		saida.push(restante);
	}

	return saida.join("\n");
}

export function estiloHtmlFonte(tamanho: TamanhoFonteImpressao): {
	fontSize: string;
	lineHeight: string;
} {
	if (tamanho === "pequena") return { fontSize: "11pt", lineHeight: "1.15" };
	if (tamanho === "grande") return { fontSize: "20pt", lineHeight: "1.25" };
	return { fontSize: "15pt", lineHeight: "1.3" };
}
