import { processarWebhookAsaas } from "@/service/assinaturas/webhook-assinatura";
export async function webhookController(request, reply) {
    const event = request.body;
    // Verify access token if configured in Asaas
    const asaasToken = request.headers["asaas-access-token"];
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expectedToken && asaasToken !== expectedToken) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
    try {
        // Process asynchronously to return quick response to Asaas
        processarWebhookAsaas(event).catch((err) => {
            console.error("Error processing webhook in background:", err);
        });
        return reply.status(200).send({ received: true });
    }
    catch (error) {
        console.error("Webhook Error:", error);
        return reply.status(500).send({ message: "Internal Server Error" });
    }
}
//# sourceMappingURL=webhook.js.map