
import { api } from "@/lib/axios";

export interface CheckoutData {
    idempresa: string;
    plano: "BASIC" | "PREMIUM";
    ciclo: "MONTHLY";
    creditCard: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    };
    creditCardHolderInfo: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode?: string;
        address?: string;
        addressNumber?: string;
        complement?: string;
        province?: string;
        city?: string;
        phone: string;
    };
}

export interface AssinaturaResponse {
    id: string;
    status: string;
    urlpagamento?: string;
}

export async function realizarCheckout(data: CheckoutData): Promise<AssinaturaResponse> {
    const response = await api.post("/checkout/assinatura", data);
    return response.data;
}
