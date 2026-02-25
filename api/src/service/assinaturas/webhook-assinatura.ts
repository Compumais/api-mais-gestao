
import { buscarAssinaturaPeloIdAsaas, atualizarAssinatura } from "@/repositories/assinatura-repositories.js";

interface AsaasWebhookEvent {
    event: "SUBSCRIPTION_CREATED" | "SUBSCRIPTION_UPDATED" | "SUBSCRIPTION_CANCELLED" | "PAYMENT_CONFIRMED" | "PAYMENT_OVERDUE" | string;
    payment: {
        id: string;
        subscription: string;
        // ... other fields
    };
    subscription?: { // Some events send subscription object directly
        id: string;
        status: string;
    };
}

export async function processarWebhookAsaas(evento: AsaasWebhookEvent) {
    const subscriptionId = evento.subscription?.id || evento.payment?.subscription;

    if (!subscriptionId) {
        console.warn("Webhook event without subscription ID", evento);
        return;
    }

    const assinatura = await buscarAssinaturaPeloIdAsaas(subscriptionId);

    if (!assinatura) {
        console.warn(`Assinatura não encontrada para ID Asaas: ${subscriptionId}`);
        return;
    }

    let novoStatus = "";

    switch (evento.event) {
        case "SUBSCRIPTION_CREATED":
            novoStatus = "ACTIVE";
            break;
        case "SUBSCRIPTION_UPDATED":
            // Status might be in payload, defaulting to check
            break;
        case "SUBSCRIPTION_CANCELLED":
            novoStatus = "CANCELLED";
            break;
        case "PAYMENT_CONFIRMED":
            novoStatus = "ACTIVE"; // Payment confirmed keeps subscription active
            // TODO: Log payment history maybe?
            break;
        case "PAYMENT_OVERDUE":
            novoStatus = "OVERDUE";
            break;
        default:
            console.log(`Evento não tratado: ${evento.event}`);
            return;
    }

    if (novoStatus) {
        await atualizarAssinatura(assinatura.id, {
            status: novoStatus,
            atualizadoem: new Date(),
        });
        console.log(`Assinatura ${assinatura.id} atualizada para ${novoStatus}`);
    }
}
