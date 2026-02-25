import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { criarAssinaturaService } from "@/service/assinaturas/criar-assinatura.js";

const checkoutBodySchema = z.object({
	idempresa: z.string().uuid(),
	plano: z.enum(["BASIC", "PREMIUM"]),
	ciclo: z.enum(["MONTHLY"]),
	creditCard: z.object({
		holderName: z.string(),
		number: z.string(),
		expiryMonth: z.string(),
		expiryYear: z.string(),
		ccv: z.string(),
	}),
	creditCardHolderInfo: z.object({
		name: z.string(),
		email: z.email("Email inválido"),
		cpfCnpj: z.string(),
		postalCode: z.string().nullable().optional(),
		address: z.string().nullable().optional(),
		addressNumber: z.string().nullable().optional(),
		complement: z.string().nullable().optional(),
		province: z.string().nullable().optional(),
		city: z.string().nullable().optional(),
		phone: z.string(),
	}),
});

export async function checkoutController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const body = checkoutBodySchema.parse(request.body);

	// TODO: Validate if user belongs to empresa or has permission
	// verifyJwt middleware ensures user is logged in, but we should check permission.
	// For now, simpler implementation.

	try {
		const { creditCardHolderInfo, ...rest } = body;
		const holderInfo = {
			name: creditCardHolderInfo.name,
			email: creditCardHolderInfo.email,
			cpfCnpj: creditCardHolderInfo.cpfCnpj,
			phone: creditCardHolderInfo.phone,
			...(creditCardHolderInfo.postalCode != null && {
				postalCode: creditCardHolderInfo.postalCode,
			}),
			...(creditCardHolderInfo.address != null && {
				address: creditCardHolderInfo.address,
			}),
			...(creditCardHolderInfo.addressNumber != null && {
				addressNumber: creditCardHolderInfo.addressNumber,
			}),
			...(creditCardHolderInfo.complement != null && {
				complement: creditCardHolderInfo.complement,
			}),
			...(creditCardHolderInfo.province != null && {
				province: creditCardHolderInfo.province,
			}),
			...(creditCardHolderInfo.city != null && {
				city: creditCardHolderInfo.city,
			}),
		};
		const assinatura = await criarAssinaturaService({
			...rest,
			creditCardHolderInfo: holderInfo,
			remoteIp: request.ip ?? "0.0.0.0",
		});

		return reply.status(201).send(assinatura);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		if (message === "Empresa não encontrada") {
			return reply.status(404).send({ message });
		}
		console.error("Checkout Error:", error);
		return reply
			.status(500)
			.send({ message: "Erro ao processar assinatura", error: message });
	}
}
