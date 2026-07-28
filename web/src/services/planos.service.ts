import { api } from "@/lib/axios";

export type TipoPlano = string;

export interface FeaturePlano {
	codigo: string;
	nome: string;
}

export interface PlanoCatalogo {
	id: string;
	codigo: string;
	nome: string;
	descricao: string | null;
	valormensal: number;
	maxempresas: number;
	maxusuarios: number;
	ordem: number;
	features: FeaturePlano[];
}

export interface ModuloCatalogo {
	id: string;
	codigo: string;
	nome: string;
	descricao: string | null;
	valormensal: number;
}

export interface CatalogoPlanos {
	planos: PlanoCatalogo[];
	modulos: ModuloCatalogo[];
}

export interface PlanoData {
	plano: string | null;
	planoAgendado?: string | null;
	inicioCiclo?: string | null;
	fimCiclo?: string | null;
	status: string;
	limites: {
		maxempresas: number;
		maxusuarios: number;
	};
	features: string[];
	modulos: string[];
	valor: number;
	nomePlano: string | null;
	mensagem?: string;
}

export interface ContratarPlanoParams {
	plano: string;
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
	plano: string;
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
	plano: string;
}

export interface DadosCartao {
	holderName: string;
	number: string;
	expiryMonth: string;
	expiryYear: string;
	ccv: string;
}

export interface DadosTitularCartao {
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
}

export interface ContratarModuloParams {
	modulo: string;
	creditCard: DadosCartao;
	creditCardHolderInfo: DadosTitularCartao;
}

export async function getCatalogo(): Promise<CatalogoPlanos> {
	const response = await api.get<CatalogoPlanos>("/planos/catalogo");
	return response.data;
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

export async function contratarModulo(params: ContratarModuloParams) {
	const response = await api.post("/planos/modulos/contratar", params);
	return response.data;
}
