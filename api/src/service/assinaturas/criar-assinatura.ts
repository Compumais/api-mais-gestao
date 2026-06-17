import { randomUUID } from "node:crypto";
import { criarAssinatura } from "@/repositories/assinatura-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";

interface CriarAssinaturaParams {
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
		phone: string;
		postalCode?: string;
		address?: string;
		addressNumber?: string;
		complement?: string;
		province?: string;
		city?: string;
	};
	remoteIp: string;
}

export async function criarAssinaturaService({
	idempresa,
	plano,
	ciclo,
}: CriarAssinaturaParams) {
	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) {
		throw new Error("Empresa n?o encontrada");
	}

	let valor = 0;
	if (plano === "BASIC") valor = 99.0;
	else if (plano === "PREMIUM") valor = 199.0;
	else throw new Error("Plano inv?lido");

	const proximoVencimento = new Date();
	proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

	const assinatura = await criarAssinatura({
		id: randomUUID(),
		idempresa,
		idassinaturaasaas: `local-${randomUUID()}`,
		status: "ACTIVE",
		plano,
		valor: valor.toString(),
		ciclo,
		proximovencimento: proximoVencimento.toISOString(),
		urlpagamento: null,
		criadoem: new Date(),
		atualizadoem: new Date(),
	});

	return assinatura;
}
