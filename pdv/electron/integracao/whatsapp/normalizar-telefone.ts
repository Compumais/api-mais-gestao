/** Normaliza telefone BR para dígitos E.164 sem '+' (55...). */
export function normalizarTelefoneE164(valor: string | null | undefined): string | null {
	const digitos = (valor ?? "").replace(/\D/g, "");
	if (!digitos) return null;
	if (digitos.length >= 12 && digitos.startsWith("55")) {
		return digitos.slice(0, 13);
	}
	if (digitos.length === 10 || digitos.length === 11) {
		return `55${digitos}`;
	}
	if (digitos.length >= 10) {
		return digitos.startsWith("55") ? digitos : `55${digitos.slice(-11)}`;
	}
	return null;
}

export function telefoneParaJid(telefoneE164: string): string {
	const digitos = telefoneE164.replace(/\D/g, "");
	return `${digitos}@s.whatsapp.net`;
}

export function jidParaTelefone(jid: string): string | null {
	const user = jid.split("@")[0]?.split(":")[0] ?? "";
	return normalizarTelefoneE164(user);
}
