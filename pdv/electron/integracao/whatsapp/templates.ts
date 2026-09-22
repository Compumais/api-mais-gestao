import { getConfig } from "../../db/database";

export type TemplateStatusWhatsapp =
	| "producao"
	| "saiu"
	| "retirada_pronta"
	| "entregue";

const TEMPLATES_PADRAO: Record<TemplateStatusWhatsapp, string> = {
	producao:
		"Olá {nome}, recebemos seu pedido #{protocolo} e já estamos preparando.",
	saiu: "Seu pedido #{protocolo} saiu para entrega.",
	retirada_pronta: "Seu pedido #{protocolo} está pronto para retirada.",
	entregue: "Pedido #{protocolo} entregue. Obrigado!",
};

const CHAVES: Record<TemplateStatusWhatsapp, string> = {
	producao: "whatsapp_msg_producao",
	saiu: "whatsapp_msg_saiu",
	retirada_pronta: "whatsapp_msg_retirada_pronta",
	entregue: "whatsapp_msg_entregue",
};

export async function obterTemplateWhatsapp(
	tipo: TemplateStatusWhatsapp,
): Promise<string> {
	const chave = CHAVES[tipo];
	const valor = (await getConfig(chave, TEMPLATES_PADRAO[tipo])).trim();
	return valor || TEMPLATES_PADRAO[tipo];
}

export function montarMensagemTemplate(
	template: string,
	vars: { nome?: string | null; protocolo?: string | null },
): string {
	const nome = (vars.nome ?? "").trim() || "cliente";
	const protocolo = (vars.protocolo ?? "").trim() || "—";
	return template
		.replaceAll("{nome}", nome)
		.replaceAll("{protocolo}", protocolo);
}

export { TEMPLATES_PADRAO, CHAVES as CHAVES_TEMPLATE_WHATSAPP };
