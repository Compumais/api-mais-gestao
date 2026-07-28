import { randomUUID } from "node:crypto";
import {
	createCustomer,
	createSubscription,
	getCustomerByEmail,
} from "@/service/asaas/asaas.service.js";
import {
	buscarClienteAsaas,
	criarClienteAsaas,
} from "@/repositories/assinatura-repositories.js";
import { buscarEmpresaCobrancaDoProprietario } from "@/repositories/empresa-repositories.js";
import {
	buscarModuloSaasPorCodigo,
	upsertUsuarioModulo,
} from "@/repositories/saas-catalog-repositories.js";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories.js";

export async function contratarModuloService(params: {
	idusuario: string;
	codigoModulo: string;
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
}) {
	const usuario = await buscarUsuarioPorId(params.idusuario);
	if (!usuario) throw new Error("Usuário não encontrado");
	if (!usuario.plano) throw new Error("Contrate um plano antes de adicionar módulos");

	const modulo = await buscarModuloSaasPorCodigo(params.codigoModulo);
	if (!modulo?.ativo) throw new Error("Módulo inválido");

	const empresa = await buscarEmpresaCobrancaDoProprietario(params.idusuario);
	if (!empresa) throw new Error("Crie uma empresa antes de contratar módulos");

	let clienteLocal = await buscarClienteAsaas(empresa.id);
	if (!clienteLocal) {
		let asaasCustomer = await getCustomerByEmail(
			params.creditCardHolderInfo.email,
		);
		if (!asaasCustomer) {
			asaasCustomer = await createCustomer({
				name: params.creditCardHolderInfo.name,
				email: params.creditCardHolderInfo.email,
				cpfCnpj: params.creditCardHolderInfo.cpfCnpj,
				phone: params.creditCardHolderInfo.phone,
				externalReference: empresa.id,
			});
		}
		clienteLocal = await criarClienteAsaas({
			id: randomUUID(),
			idempresa: empresa.id,
			idclienteasaas: asaasCustomer.id,
			criadoem: new Date(),
		});
	}
	if (!clienteLocal) throw new Error("Falha ao obter cliente Asaas");

	const valor = Number(modulo.valormensal);
	const proximo = new Date();
	proximo.setMonth(proximo.getMonth() + 1);
	const nextDueDate = proximo.toISOString().slice(0, 10);

	const subscription = await createSubscription({
		customer: clienteLocal.idclienteasaas,
		billingType: "CREDIT_CARD",
		value: valor,
		nextDueDate,
		cycle: "MONTHLY",
		description: `Módulo ${modulo.nome}`,
		externalReference: `modulo:${params.idusuario}:${modulo.codigo}`,
		creditCard: params.creditCard,
		creditCardHolderInfo: params.creditCardHolderInfo,
		remoteIp: params.remoteIp,
	});

	await upsertUsuarioModulo({
		id: randomUUID(),
		idusuario: params.idusuario,
		idmodulo: modulo.id,
		status: "ACTIVE",
		origem: "ASAAS",
		idassinaturaasaas: subscription.id,
		valor: valor.toFixed(2),
		proximovencimento: nextDueDate,
	});

	return {
		modulo: modulo.codigo,
		nome: modulo.nome,
		status: "ACTIVE",
		valor,
		idassinaturaasaas: subscription.id,
		urlpagamento: subscription.invoiceUrl ?? null,
		proximoVencimento: nextDueDate,
	};
}
