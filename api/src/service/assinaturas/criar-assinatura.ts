import { randomUUID } from "node:crypto";
import {
	buscarClienteAsaas,
	criarAssinatura,
	criarClienteAsaas,
} from "@/repositories/assinatura-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { createCustomer, createSubscription } from "../asaas/asaas.service.js";

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
	creditCard,
	creditCardHolderInfo,
	remoteIp,
}: CriarAssinaturaParams) {
	// 1. Verificar se empresa existe
	const empresa = await buscarEmpresaPorId(idempresa);
	if (!empresa) {
		throw new Error("Empresa não encontrada");
	}

	// 2. Verificar/Criar Cliente no Asaas
	let clienteAsaas = await buscarClienteAsaas(idempresa);

	if (!clienteAsaas) {
		// Procura no Asaas pelo email da empresa ou do holder
		// Mas o ideal é usar os dados da empresa se tiver, ou do holder.
		// O prompt diz "Criar cliente no Asass(caso não exista)".

		// Vamos usar os dados do Credit Card Holder como dados do cliente Asaas,
		// pois a assinatura é cobrada dele.

		const asaasCustomer = await createCustomer({
			name: creditCardHolderInfo.name,
			email: creditCardHolderInfo.email,
			cpfCnpj: creditCardHolderInfo.cpfCnpj,
			phone: creditCardHolderInfo.phone,
			externalReference: idempresa,
		});

		if (!asaasCustomer) {
			throw new Error("Cliente Asaas não encontrado");
		}

		clienteAsaas = await criarClienteAsaas({
			id: randomUUID(),
			idempresa,
			idclienteasaas: asaasCustomer.id,
			criadoem: new Date(),
		});
	}

	if (!clienteAsaas) {
		throw new Error("Cliente Asaas não encontrado");
	}

	const idClienteAsaas = clienteAsaas.idclienteasaas;
	if (!idClienteAsaas) {
		throw new Error("ID do cliente Asaas não encontrado");
	}

	// 3. Definir valor do plano
	let valor = 0;
	if (plano === "BASIC") valor = 99.0;
	else if (plano === "PREMIUM") valor = 199.0;
	else throw new Error("Plano inválido");

	const nextDueDate =
		new Date().toISOString().split("T")[0] ??
		new Date().toISOString().slice(0, 10);

	// 4. Criar Assinatura no Asaas
	const asaasSubscription = await createSubscription({
		customer: idClienteAsaas,
		billingType: "CREDIT_CARD",
		value: valor,
		nextDueDate,
		cycle: "MONTHLY",
		description: `Assinatura Plano ${plano}`,
		externalReference: idempresa,
		creditCard,
		creditCardHolderInfo,
		remoteIp,
	});

	// 5. Salvar Assinatura localmente
	const assinatura = await criarAssinatura({
		id: randomUUID(),
		idempresa,
		idassinaturaasaas: asaasSubscription.id,
		status: asaasSubscription.status,
		plano,
		valor: valor.toString(), // numeric field expects string or number, drizzle types usually string for numeric
		ciclo,
		proximovencimento: asaasSubscription.nextDueDate,
		urlpagamento: asaasSubscription.invoiceUrl,
		criadoem: new Date(),
		atualizadoem: new Date(),
	});

	return assinatura;
}
