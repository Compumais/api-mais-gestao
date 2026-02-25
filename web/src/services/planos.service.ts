import { api } from "@/lib/axios";

export type TipoPlano = "BASIC" | "PREMIUM" | "ENTERPRISE";

export interface PlanoData {
	plano: TipoPlano | null;
	planoAgendado?: TipoPlano | null;
	inicioCiclo?: string | null;
	fimCiclo?: string | null;
	status: string;
	mensagem?: string;
}

export interface ContratarPlanoParams {
	plano: TipoPlano;
	ciclo?: "MONTHLY";
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

export interface UpgradePlanoParams {
	plano: TipoPlano;
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

export interface DowngradePlanoParams {
	plano: TipoPlano;
}

export async function getMeuPlano(idempresa?: string): Promise<PlanoData> {
	const url = idempresa
		? `/planos/meu-plano?idempresa=${idempresa}`
		: "/planos/meu-plano";
	const response = await api.get<PlanoData>(url);
	return response.data;
}

export async function contratarPlano(params: ContratarPlanoParams) {
	const response = await api.post("/planos/contratar", {
		plano: params.plano,
		ciclo: params.ciclo || "MONTHLY",
		creditCard: params.creditCard,
		creditCardHolderInfo: params.creditCardHolderInfo,
	});
	return response.data;
}

export async function upgradePlano(params: UpgradePlanoParams) {
	const response = await api.post("/planos/upgrade", {
		plano: params.plano,
		creditCard: params.creditCard,
		creditCardHolderInfo: params.creditCardHolderInfo,
	});
	return response.data;
}

export async function downgradePlano(params: DowngradePlanoParams) {
	const response = await api.post("/planos/downgrade", {
		plano: params.plano,
	});
	return response.data;
}

