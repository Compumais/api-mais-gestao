/** Normaliza telefone BR para dígitos E.164 sem '+' (55...). */
export function normalizarTelefoneE164(
	valor: string | null | undefined,
): string | null {
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

/** JID @lid / grupo / status não é telefone — não inventar E.164 a partir do LID. */
export function jidParaTelefone(jid: string): string | null {
	const trimmed = (jid ?? "").trim();
	if (!trimmed) return null;
	const server = trimmed.split("@")[1] ?? "s.whatsapp.net";
	if (server !== "s.whatsapp.net" && server !== "c.us") {
		return null;
	}
	const user = trimmed.split("@")[0]?.split(":")[0] ?? "";
	return normalizarTelefoneE164(user);
}

/** WhatsApp costuma omitir o 9º dígito; o pedido no PDV pode ter ou não. */
export function variantesTelefoneE164(
	valor: string | null | undefined,
): string[] {
	const base = normalizarTelefoneE164(valor);
	if (!base) return [];
	const out = new Set<string>([base]);
	const local = base.startsWith("55") ? base.slice(2) : base;
	if (local.length < 10) return [...out];
	const ddd = local.slice(0, 2);
	let num = local.slice(2);
	if (num.length === 9 && num.startsWith("9")) {
		num = num.slice(1);
	}
	if (num.length === 8) {
		const semNove = normalizarTelefoneE164(`${ddd}${num}`);
		const comNove = normalizarTelefoneE164(`${ddd}9${num}`);
		if (semNove) out.add(semNove);
		if (comNove) out.add(comNove);
	}
	return [...out];
}

export function sufixosBuscaTelefone(
	valor: string | null | undefined,
): string[] {
	const sufixos = new Set<string>();
	for (const variante of variantesTelefoneE164(valor)) {
		const local = variante.startsWith("55") ? variante.slice(2) : variante;
		if (local.length >= 10) sufixos.add(local);
	}
	return [...sufixos];
}

type MensagemBaileys = {
	conversation?: string;
	extendedTextMessage?: { text?: string };
	imageMessage?: { caption?: string };
	videoMessage?: { caption?: string };
	documentMessage?: { caption?: string };
	ephemeralMessage?: { message?: MensagemBaileys };
	viewOnceMessage?: { message?: MensagemBaileys };
	viewOnceMessageV2?: { message?: MensagemBaileys };
	documentWithCaptionMessage?: { message?: MensagemBaileys };
};

export function extrairTextoMensagemWhatsapp(
	message: MensagemBaileys | null | undefined,
): string {
	const inner =
		message?.ephemeralMessage?.message ||
		message?.viewOnceMessage?.message ||
		message?.viewOnceMessageV2?.message ||
		message?.documentWithCaptionMessage?.message ||
		message;
	return (
		inner?.conversation ||
		inner?.extendedTextMessage?.text ||
		inner?.imageMessage?.caption ||
		inner?.videoMessage?.caption ||
		inner?.documentMessage?.caption ||
		""
	).trim();
}
