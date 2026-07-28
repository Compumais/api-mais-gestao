import { randomUUID } from "node:crypto";
import {
	calcularDiasRestantesNoCiclo,
	calcularDiasTotaisDoCiclo,
	calcularValorProporcional,
} from "@/constants/planos.js";
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
	createPayment,
	createSubscription,
	getCustomerByEmail,
} from "@/service/asaas/asaas.service.js";

export async function upgradePlanoService({
	idusuario,
	planoNovo,
	creditCard,
	creditCardHolderInfo,
	remoteIp,
}: {
	idusuario: string;
	planoNovo: string;
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
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) throw new Error("Usuário não encontrado");

	const planoAtual = usuario.plano?.toUpperCase() ?? null;
	if (!planoAtual) throw new Error("Usuário não possui plano ativo");

	const planoAtualCat = await buscarPlanoSaasPorCodigo(planoAtual);
	const planoNovoCat = await buscarPlanoSaasPorCodigo(planoNovo);
	if (!planoNovoCat?.ativo) throw new Error("Plano inválido");
	if ((planoNovoCat.ordem ?? 0) <= (planoAtualCat?.ordem ?? 0)) {
		throw new Error("O plano informado não é um upgrade");
	}

	const valorAtual = Number(planoAtualCat?.valormensal ?? 0);
	const valorNovo = Number(planoNovoCat.valormensal);
	const hoje = new Date();
	const inicioCiclo = usuario.plano_inicio_ciclo
		? new Date(usuario.plano_inicio_ciclo)
		: hoje;
	const fimCiclo = usuario.plano_fim_ciclo
		? new Date(usuario.plano_fim_ciclo)
		: new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());

	const diasRestantes = calcularDiasRestantesNoCiclo(
		inicioCiclo,
		fimCiclo,
		hoje,
	);
	const diasTotais = calcularDiasTotaisDoCiclo(inicioCiclo, fimCiclo);
	const valorProporcional = Math.max(
		0,
		Number(
			calcularValorProporcional(
				valorAtual,
				valorNovo,
				diasRestantes,
				diasTotais,
			).toFixed(2),
		),
	);

	const empresa = await buscarEmpresaCobrancaDoProprietario(idusuario);
	if (!empresa) throw new Error("Crie uma empresa antes de alterar o plano");

	let clienteLocal = await buscarClienteAsaas(empresa.id);
	if (!clienteLocal) {
		let asaasCustomer = await getCustomerByEmail(creditCardHolderInfo.email);
		if (!asaasCustomer) {
			asaasCustomer = await createCustomer({
				name: creditCardHolderInfo.name,
				email: creditCardHolderInfo.email,
				cpfCnpj: creditCardHolderInfo.cpfCnpj,
				phone: creditCardHolderInfo.phone,
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

	let asaasPaymentId: string | undefined;
	let asaasInvoiceUrl: string | undefined;
	if (valorProporcional > 0) {
		const payment = await createPayment({
			customer: clienteLocal.idclienteasaas,
			billingType: "CREDIT_CARD",
			value: valorProporcional,
			dueDate: hoje.toISOString().slice(0, 10),
			description: `Upgrade ${planoAtual} → ${planoNovo}`,
			externalReference: `upgrade:${idusuario}:${planoNovo}`,
			creditCard,
			creditCardHolderInfo,
			remoteIp,
		});
		asaasPaymentId = payment.id;
		asaasInvoiceUrl = payment.invoiceUrl;
	}

	const subscription = await createSubscription({
		customer: clienteLocal.idclienteasaas,
		billingType: "CREDIT_CARD",
		value: valorNovo,
		nextDueDate: fimCiclo.toISOString().slice(0, 10),
		cycle: "MONTHLY",
		description: `Plano ${planoNovoCat.nome}`,
		externalReference: `plano:${idusuario}:${planoNovo}`,
		creditCard,
		creditCardHolderInfo,
		remoteIp,
	});

	await atualizarPlanoUsuario(idusuario, {
		plano: planoNovoCat.codigo,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
		plano_proximo: null,
	});

	const existente = await buscarAssinaturaPorEmpresa(empresa.id);
	if (existente) {
		await atualizarAssinatura(existente.id, {
			idusuario,
			idassinaturaasaas: subscription.id,
			status: "ACTIVE",
			plano: planoNovoCat.codigo,
			origem: "ASAAS",
			valor: valorNovo.toFixed(2),
			proximovencimento: fimCiclo.toISOString().slice(0, 10),
			urlpagamento: subscription.invoiceUrl ?? asaasInvoiceUrl ?? null,
			atualizadoem: new Date(),
		});
	} else {
		await criarAssinatura({
			id: randomUUID(),
			idempresa: empresa.id,
			idusuario,
			idassinaturaasaas: subscription.id,
			status: "ACTIVE",
			plano: planoNovoCat.codigo,
			origem: "ASAAS",
			valor: valorNovo.toFixed(2),
			ciclo: "MONTHLY",
			proximovencimento: fimCiclo.toISOString().slice(0, 10),
			urlpagamento: subscription.invoiceUrl ?? null,
			criadoem: new Date(),
			atualizadoem: new Date(),
		});
	}

	return {
		planoAnterior: planoAtual,
		planoNovo: planoNovoCat.codigo,
		valorProporcional,
		diasRestantes,
		proximoVencimento: fimCiclo,
		asaasPaymentId,
		asaasInvoiceUrl,
		empresaCobrancaId: empresa.id,
		valorNovoMensal: valorNovo,
	};
}
