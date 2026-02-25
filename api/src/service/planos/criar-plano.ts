import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { TipoPlano } from "@/constants/planos.js";
import { obterValorPlano } from "@/constants/planos.js";
import {
	buscarClienteAsaas,
	criarClienteAsaas,
} from "@/repositories/assinatura-repositories.js";
import { db } from "@/repositories/connection.js";
import {
	atualizarPlanoUsuario,
	buscarUsuarioPorId,
} from "@/repositories/usuarios-repositories.js";
import * as schema from "../../../drizzle/schema.js";
import {
	createCustomer,
	createSubscription,
	getCustomerByEmail,
} from "../asaas/asaas.service.js";

interface CriarPlanoParams {
	idusuario: string;
	plano: TipoPlano;
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
	remoteIp: string;
}

export async function criarPlanoService({
	idusuario,
	plano,
	ciclo,
	creditCard,
	creditCardHolderInfo,
	remoteIp,
}: CriarPlanoParams) {
	// 1. Verificar se usuário existe e não possui plano
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usuário não encontrado");
	}

	if (usuario.plano !== null) {
		throw new Error("Usuário já possui um plano ativo");
	}

	// 2. Buscar ou criar cliente no Asaas vinculado ao usuário
	// Primeiro, tentar buscar cliente existente pelo email do usuário
	let clienteAsaasId: string | null = null;

	// Verificar se já existe cliente Asaas para este usuário (buscar por email)
	const asaasCustomer = await getCustomerByEmail(usuario.email);

	if (asaasCustomer) {
		clienteAsaasId = asaasCustomer.id;
	} else {
		// Criar novo cliente no Asaas
		const novoCliente = await createCustomer({
			name: creditCardHolderInfo.name || usuario.nome,
			email: creditCardHolderInfo.email || usuario.email,
			cpfCnpj: creditCardHolderInfo.cpfCnpj,
			phone: creditCardHolderInfo.phone,
			externalReference: idusuario,
		});
		clienteAsaasId = novoCliente.id;
	}

	// 3. Definir valor do plano
	const valor = obterValorPlano(plano);

	// 4. Calcular datas do ciclo (início hoje, fim em 30 dias)
	const hoje = new Date();
	const fimCiclo = new Date(hoje);
	fimCiclo.setMonth(fimCiclo.getMonth() + 1);

	// 5. Criar Assinatura no Asaas
	const asaasSubscription = await createSubscription({
		customer: clienteAsaasId,
		billingType: "CREDIT_CARD",
		value: valor,
		nextDueDate: fimCiclo.toISOString().split("T")[0]!,
		cycle: "MONTHLY",
		description: `Assinatura Plano ${plano} - Usuário`,
		externalReference: idusuario,
		creditCard,
		creditCardHolderInfo,
		remoteIp,
	});

	// 6. Atualizar plano do usuário
	await atualizarPlanoUsuario(idusuario, {
		plano,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
		plano_proximo: null,
	});

	// 7. Armazenar referência da assinatura Asaas (opcional - podemos criar uma tabela específica)
	// Por enquanto, vamos armazenar o ID da assinatura Asaas em algum lugar
	// Pode ser em uma nova tabela ou usar a tabela de assinaturas existente adaptada

	return {
		plano,
		status: asaasSubscription.status,
		valor,
		proximoVencimento: fimCiclo,
		idassinaturaasaas: asaasSubscription.id,
		urlpagamento: asaasSubscription.invoiceUrl,
	};
}
