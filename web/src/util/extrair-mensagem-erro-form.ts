import type { FieldErrors } from "react-hook-form";

export function extrairPrimeiraMensagemErroForm(
	errors: FieldErrors,
	prefixo = "",
): string | undefined {
	for (const [chave, valor] of Object.entries(errors)) {
		if (!valor) continue;

		const caminho = prefixo ? `${prefixo}.${chave}` : chave;

		if (
			typeof valor === "object" &&
			"message" in valor &&
			typeof valor.message === "string" &&
			valor.message
		) {
			return `${caminho}: ${valor.message}`;
		}

		if (typeof valor === "object") {
			const aninhado = extrairPrimeiraMensagemErroForm(
				valor as FieldErrors,
				caminho,
			);
			if (aninhado) return aninhado;
		}
	}

	return undefined;
}
