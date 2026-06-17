import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buscarAssinaturaPorEmpresa } from "@/repositories/assinatura-repositories.js";

const PLANO_PADRAO = "ENTERPRISE";

export async function getMeuPlanoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const querySchema = z.object({
		idempresa: z.string().uuid(),
	});

	const { idempresa } = querySchema.parse(request.query);
	const assinatura = await buscarAssinaturaPorEmpresa(idempresa);

	return reply.send({
		plan: assinatura?.plano ?? PLANO_PADRAO,
		status: "ACTIVE",
		amount: assinatura?.valor ? Number(assinatura.valor) : 0,
		nextBillingDate: assinatura?.proximovencimento ?? null,
		paymentMethod: "LOCAL",
		invoiceUrl: assinatura?.urlpagamento ?? null,
	});
}

export async function cancelarAssinaturaController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	return reply.send({
		message: "Cancelamento de assinatura desativado temporariamente.",
	});
}
