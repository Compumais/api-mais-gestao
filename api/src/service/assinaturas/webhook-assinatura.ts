interface AsaasWebhookEvent {
	event: string;
	payment?: {
		id: string;
		subscription: string;
	};
	subscription?: {
		id: string;
		status: string;
	};
}

/**
 * Webhook do Asaas ignorado temporariamente para n?o alterar acesso por pagamento.
 */
export async function processarWebhookAsaas(evento: AsaasWebhookEvent) {
	console.log(
		`Webhook Asaas ignorado temporariamente: ${evento.event ?? "sem-evento"}`,
	);
	return;
}
