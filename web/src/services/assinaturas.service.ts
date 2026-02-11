
import { api } from "@/lib/axios";

export interface AssinaturaData {
    plan: string;
    status: string;
    amount: number;
    nextBillingDate?: string;
    paymentMethod: string;
    invoiceUrl?: string;
}

export async function getMeuPlano(idempresa: string): Promise<AssinaturaData> {
    const response = await api.get<AssinaturaData>(`/assinaturas/meu-plano?idempresa=${idempresa}`);
    return response.data;
}

export async function cancelarAssinatura(idempresa: string): Promise<void> {
    await api.post("/assinaturas/cancelar", { idempresa });
}
