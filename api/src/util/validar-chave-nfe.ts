export function normalizarChaveNfe(chave: string): string {
	return chave.replace(/\D/g, "");
}

export function validarChaveNfe(chave: string): { ok: true; chave: string } | { ok: false; mensagem: string } {
	const normalizada = normalizarChaveNfe(chave);

	if (normalizada.length !== 44) {
		return {
			ok: false,
			mensagem: "A chave NF-e deve conter exatamente 44 dígitos",
		};
	}

	if (!/^\d{44}$/.test(normalizada)) {
		return {
			ok: false,
			mensagem: "A chave NF-e deve conter apenas números",
		};
	}

	return { ok: true, chave: normalizada };
}
