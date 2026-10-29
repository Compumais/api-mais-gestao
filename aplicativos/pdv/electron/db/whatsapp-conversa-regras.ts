export type StatusConversaWhatsapp = "aberta" | "finalizada";

export type DestinoConversaWhatsapp =
	| { acao: "usar"; id: string }
	| { acao: "criar"; idconta: string | null };

/** Conversa do pedido nunca é reutilizada por telefone nem reaberta após entrega. */
export function decidirInboundWhatsapp(params: {
	contaAberta: { id: string } | null;
	conversaDaConta: { id: string; status: StatusConversaWhatsapp } | null;
	conversaAvulsaAberta: { id: string } | null;
}): DestinoConversaWhatsapp {
	if (params.contaAberta) {
		if (params.conversaDaConta?.status === "aberta") {
			return { acao: "usar", id: params.conversaDaConta.id };
		}
		if (!params.conversaDaConta) {
			return { acao: "criar", idconta: params.contaAberta.id };
		}
	}
	if (params.conversaAvulsaAberta) {
		return { acao: "usar", id: params.conversaAvulsaAberta.id };
	}
	return { acao: "criar", idconta: null };
}
