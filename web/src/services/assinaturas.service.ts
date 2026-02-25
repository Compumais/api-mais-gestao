import { api } from "@/lib/axios";

export interface AssinaturaData {
	plan: string | null;
	status: string;
	amount: number;
	nextBillingDate?: string;
	paymentMethod: string;
	invoiceUrl?: string;
}

export async function getMeuPlano(
	idempresa: string,
): Promise<AssinaturaData | null> {
	try {
		const response = await api.get<AssinaturaData>(
			`/assinaturas/meu-plano?idempresa=${idempresa}`,
		);
		return response.data;
	} catch (error: any) {
		// Se for 404 ou mensagem indica que não há assinatura, retorna null
		// O interceptor do axios transforma erros em Error com apenas a mensagem,
		// então verificamos a mensagem do erro
		if (
			error?.response?.status === 404 ||
			error?.message?.includes("Nenhuma assinatura encontrada") ||
			error?.message?.includes("não encontrada")
		) {
			return null;
		}
		// Para outros erros, relança a exceção
		throw error;
	}
}

export async function cancelarAssinatura(idempresa: string): Promise<void> {
	await api.post("/assinaturas/cancelar", { idempresa });
}
