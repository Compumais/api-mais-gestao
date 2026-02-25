import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	atualizarAssinatura,
	buscarAssinaturaPorEmpresa,
} from "@/repositories/assinatura-repositories.js";
import {
	cancelSubscription,
	getSubscription,
} from "@/service/asaas/asaas.service.js";

export async function getMeuPlanoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Assuming the user identification/company ID comes from query param or user session
	// For this implementation, we'll expect 'idempresa' in the query string as previously discussed,
	// or derived from the authenticated user's context if available.
	// Given the previous patterns, let's use query param validation.

	const querySchema = z.object({
		idempresa: z.string().uuid(),
	});

	const { idempresa } = querySchema.parse(request.query);

	const assinatura = await buscarAssinaturaPorEmpresa(idempresa);

	if (!assinatura) {
		return reply
			.status(404)
			.send({ message: "Nenhuma assinatura encontrada para esta empresa." });
	}

	// Fetch latest status from Asaas to be sure
	try {
		const asaasSubscription = await getSubscription(
			assinatura.idassinaturaasaas,
		);

		// Update local status if different
		if (asaasSubscription.status !== assinatura.status) {
			await atualizarAssinatura(assinatura.id, {
				status: asaasSubscription.status,
				atualizadoem: new Date(),
			});
			assinatura.status = asaasSubscription.status;
		}

		return reply.send({
			plan: assinatura.plano,
			status: assinatura.status,
			amount: asaasSubscription.value,
			nextBillingDate: asaasSubscription.nextDueDate,
			paymentMethod: asaasSubscription.billingType, // Or more detailed info if available
			invoiceUrl: asaasSubscription.invoiceUrl,
		});
	} catch (error) {
		console.error("Error fetching subscription from Asaas:", error);
		// Return local data if Asaas fails, but warn
		return reply.send({
			plan: assinatura.plano,
			status: assinatura.status,
			// fallback values
			amount: assinatura.valor,
			nextBillingDate: assinatura.proximovencimento,
			paymentMethod: "CREDIT_CARD",
		});
	}
}

export async function cancelarAssinaturaController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const bodySchema = z.object({
		idempresa: z.string().uuid(),
	});

	const { idempresa } = bodySchema.parse(request.body);

	const assinatura = await buscarAssinaturaPorEmpresa(idempresa);

	if (!assinatura) {
		return reply.status(404).send({ message: "Assinatura não encontrada." });
	}

	if (assinatura.status !== "ACTIVE") {
		return reply.status(400).send({ message: "Assinatura não está ativa." });
	}

	try {
		await cancelSubscription(assinatura.idassinaturaasaas);

		await atualizarAssinatura(assinatura.id, {
			status: "CANCELLED", // Asaas returns 'DELETED' or similar, but we check next sync
			// better to set local status to cancelled immediately for UI feedback
			atualizadoem: new Date(),
		});

		return reply.send({ message: "Assinatura cancelada com sucesso." });
	} catch (error: any) {
		console.error("Error cancelling subscription:", error);
		return reply
			.status(500)
			.send({ message: "Erro ao cancelar assinatura.", error: error.message });
	}
}
