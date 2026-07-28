import { randomUUID } from "node:crypto";
import {
	atualizarAssinatura,
	buscarAssinaturaPorEmpresa,
	buscarClienteAsaas,
	criarAssinatura,
	criarClienteAsaas,
} from "@/repositories/assinatura-repositories.js";
import { buscarEmpresaCobrancaDoProprietario } from "@/repositories/empresa-repositories.js";
import { buscarPlanoSaasPorCodigo } from "@/repositories/saas-catalog-repositories.js";
import {
	atualizarPlanoUsuario,
	buscarUsuarioPorId,
} from "@/repositories/usuarios-repositories.js";
import {
	createCustomer,
	createSubscription,
	getCustomerByEmail,
} from "@/service/asaas/asaas.service.js";

type CartaoParams = {
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
};

async function garantirClienteAsaas(params: {
	idempresa: string;
	email: string;
	name: string;
	cpfCnpj: string;
	phone?: string;
}) {
	const existente = await buscarClienteAsaas(params.idempresa);
	if (existente) return existente;

	let asaasCustomer = await getCustomerByEmail(params.email);
	if (!asaasCustomer) {
		asaasCustomer = await createCustomer({
			name: params.name,
			email: params.email,
			cpfCnpj: params.cpfCnpj,
			phone: params.phone,
			externalReference: params.idempresa,
		});
	}

	const criado = await criarClienteAsaas({
		id: randomUUID(),
		idempresa: params.idempresa,
		idclienteasaas: asaasCustomer.id,
		criadoem: new Date(),
	});
	if (!criado) throw new Error("Falha ao persistir cliente Asaas");
	return criado;
}

export async function criarPlanoService({
	idusuario,
	plano,
	creditCard,
	creditCardHolderInfo,
	remoteIp,
}: {
	idusuario: string;
	plano: string;
	ciclo: "MONTHLY";
} & CartaoParams) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) throw new Error("Usuário não encontrado");
	if (usuario.plano) throw new Error("Usuário já possui um plano ativo");

	const planoCatalogo = await buscarPlanoSaasPorCodigo(plano);
	if (!planoCatalogo || !planoCatalogo.ativo) {
		throw new Error("Plano inválido");
	}
	const valor = Number(planoCatalogo.valormensal);

	const empresa = await buscarEmpresaCobrancaDoProprietario(idusuario);
	if (!empresa) {
		throw new Error("Crie uma empresa antes de contratar o plano");
	}

	const clienteLocal = await garantirClienteAsaas({
		idempresa: empresa.id,
		email: creditCardHolderInfo.email,
		name: creditCardHolderInfo.name,
		cpfCnpj: creditCardHolderInfo.cpfCnpj,
		phone: creditCardHolderInfo.phone,
	});

	const hoje = new Date();
	const fimCiclo = new Date(hoje);
	fimCiclo.setMonth(fimCiclo.getMonth() + 1);
	const nextDueDate = fimCiclo.toISOString().slice(0, 10);

	const subscription = await createSubscription({
		customer: clienteLocal.idclienteasaas,
		billingType: "CREDIT_CARD",
		value: valor,
		nextDueDate,
		cycle: "MONTHLY",
		description: `Plano ${planoCatalogo.nome}`,
		externalReference: `plano:${idusuario}:${planoCatalogo.codigo}`,
		creditCard,
		creditCardHolderInfo,
		remoteIp,
	});

	await atualizarPlanoUsuario(idusuario, {
		plano: planoCatalogo.codigo,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
		plano_proximo: null,
	});

	const existente = await buscarAssinaturaPorEmpresa(empresa.id);
	if (existente) {
		await atualizarAssinatura(existente.id, {
			idusuario,
			idassinaturaasaas: subscription.id,
			status: subscription.status || "ACTIVE",
			plano: planoCatalogo.codigo,
			origem: "ASAAS",
			valor: valor.toFixed(2),
			ciclo: "MONTHLY",
			proximovencimento: nextDueDate,
			urlpagamento: subscription.invoiceUrl ?? null,
			atualizadoem: new Date(),
		});
	} else {
		await criarAssinatura({
			id: randomUUID(),
			idempresa: empresa.id,
			idusuario,
			idassinaturaasaas: subscription.id,
			status: subscription.status || "ACTIVE",
			plano: planoCatalogo.codigo,
			origem: "ASAAS",
			valor: valor.toFixed(2),
			ciclo: "MONTHLY",
			proximovencimento: nextDueDate,
			urlpagamento: subscription.invoiceUrl ?? null,
			criadoem: new Date(),
			atualizadoem: new Date(),
		});
	}

	return {
		plano: planoCatalogo.codigo,
		status: "ACTIVE",
		valor,
		proximoVencimento: fimCiclo,
		idassinaturaasaas: subscription.id,
		urlpagamento: subscription.invoiceUrl ?? null,
	};
}
