import type { TipoPlano } from "@/constants/planos.js";
import {
	calcularDiasRestantesNoCiclo,
	calcularDiasTotaisDoCiclo,
	calcularValorProporcional,
	isPlanoSuperior,
	obterValorPlano,
} from "@/constants/planos.js";
import {
	atualizarAssinatura,
	buscarAssinaturaPorEmpresa,
	buscarClienteAsaas,
	criarAssinatura,
	criarClienteAsaas,
} from "@/repositories/assinatura-repositories.js";
import { buscarEmpresaCobrancaDoProprietario } from "@/repositories/empresa-repositories.js";
import { buscarUsuarioPorId, atualizarPlanoUsuario } from "@/repositories/usuarios-repositories.js";
import {
	createCustomer,
	createPayment,
	createSubscription,
	getCustomerByEmail,
} from "@/service/asaas/asaas.service.js";
import { randomUUID } from "node:crypto";

interface UpgradePlanoParams {
	idusuario: string;
	planoNovo: TipoPlano;
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

function formatDateOnly(date: Date) {
	return date.toISOString().slice(0, 10);
}

export async function upgradePlanoService({
	idusuario,
	planoNovo,
	creditCard,
	creditCardHolderInfo,
	remoteIp,
}: UpgradePlanoParams) {
	const usuario = await buscarUsuarioPorId(idusuario);
	if (!usuario) {
		throw new Error("Usuário não encontrado");
	}

	if (!usuario.plano) {
		throw new Error(
			"Usuário não possui plano ativo. Use a contratação inicial.",
		);
	}

	const planoAtual = usuario.plano as TipoPlano;

	if (!isPlanoSuperior(planoAtual, planoNovo)) {
		throw new Error(
			"O novo plano deve ser superior ao plano atual para realizar upgrade",
		);
	}

	if (!usuario.plano_inicio_ciclo || !usuario.plano_fim_ciclo) {
		throw new Error("Ciclo de plano inválido");
	}

	const inicioCiclo = new Date(usuario.plano_inicio_ciclo);
	const fimCiclo = new Date(usuario.plano_fim_ciclo);
	const hoje = new Date();

	const diasRestantes = calcularDiasRestantesNoCiclo(
		inicioCiclo,
		fimCiclo,
		hoje,
	);
	const diasTotais = calcularDiasTotaisDoCiclo(inicioCiclo, fimCiclo);
	const valorAtualMensal = obterValorPlano(planoAtual);
	const valorNovoMensal = obterValorPlano(planoNovo);
	const valorProporcional = calcularValorProporcional(
		valorAtualMensal,
		valorNovoMensal,
		diasRestantes,
		diasTotais,
	);

	const empresaCobranca = await buscarEmpresaCobrancaDoProprietario(idusuario);
	if (!empresaCobranca) {
		throw new Error("Proprietário sem empresa para cobrança");
	}

	let clienteAsaas = await buscarClienteAsaas(empresaCobranca.id);
	if (!clienteAsaas) {
		const encontrado = await getCustomerByEmail(creditCardHolderInfo.email);
		if (encontrado) {
			clienteAsaas = await criarClienteAsaas({
				id: randomUUID(),
				idempresa: empresaCobranca.id,
				idclienteasaas: encontrado.id,
				criadoem: new Date(),
			});
		} else {
			const criado = await createCustomer({
				name: creditCardHolderInfo.name,
				email: creditCardHolderInfo.email,
				cpfCnpj: creditCardHolderInfo.cpfCnpj,
				phone: creditCardHolderInfo.phone,
				externalReference: empresaCobranca.id,
			});
			clienteAsaas = await criarClienteAsaas({
				id: randomUUID(),
				idempresa: empresaCobranca.id,
				idclienteasaas: criado.id,
				criadoem: new Date(),
			});
		}
	}

	if (!clienteAsaas?.idclienteasaas) {
		throw new Error("Cliente Asaas não encontrado");
	}

	const assinaturaLocal = await buscarAssinaturaPorEmpresa(empresaCobranca.id);
	const today = formatDateOnly(hoje);

	let asaasPaymentId: string | undefined;
	let asaasInvoiceUrl: string | undefined;

	if (!assinaturaLocal) {
		const asaasSubscription = await createSubscription({
			customer: clienteAsaas.idclienteasaas,
			billingType: "CREDIT_CARD",
			value: valorNovoMensal,
			nextDueDate: today,
			cycle: "MONTHLY",
			description: `Assinatura Plano ${planoNovo}`,
			externalReference: empresaCobranca.id,
			creditCard,
			creditCardHolderInfo,
			remoteIp,
		});

		await criarAssinatura({
			id: randomUUID(),
			idempresa: empresaCobranca.id,
			idassinaturaasaas: asaasSubscription.id,
			status: asaasSubscription.status,
			plano: planoNovo,
			valor: valorNovoMensal.toString(),
			ciclo: "MONTHLY",
			proximovencimento: asaasSubscription.nextDueDate,
			urlpagamento: asaasSubscription.invoiceUrl,
			criadoem: new Date(),
			atualizadoem: new Date(),
		});

		asaasInvoiceUrl = asaasSubscription.invoiceUrl;
	} else {
		const valorParaCobrar = Math.max(0, Math.round(valorProporcional * 100) / 100);

		if (valorParaCobrar > 0) {
			const pagamento = await createPayment({
				customer: clienteAsaas.idclienteasaas,
				billingType: "CREDIT_CARD",
				value: valorParaCobrar,
				dueDate: today,
				description: `Upgrade de plano (${planoAtual} → ${planoNovo})`,
				externalReference: `${empresaCobranca.id}:upgrade:${idusuario}`,
				creditCard,
				creditCardHolderInfo,
				remoteIp,
			});

			asaasPaymentId = pagamento.id;
			asaasInvoiceUrl = pagamento.invoiceUrl;
		}

		await atualizarAssinatura(assinaturaLocal.id, {
			plano: planoNovo,
			valor: valorNovoMensal.toString(),
			atualizadoem: new Date(),
		});
	}

	await atualizarPlanoUsuario(idusuario, {
		plano: planoNovo,
		plano_inicio_ciclo: hoje,
		plano_fim_ciclo: fimCiclo,
		plano_proximo: null,
	});

	return {
		planoAnterior: planoAtual,
		planoNovo,
		valorProporcional,
		diasRestantes,
		proximoVencimento: fimCiclo,
		asaasPaymentId,
		asaasInvoiceUrl,
		empresaCobrancaId: empresaCobranca.id,
	};
}
