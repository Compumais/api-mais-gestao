import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { upgradePlanoService } from "@/service/planos/upgrade-plano.js";
import type { TipoPlano } from "@/constants/planos.js";

const upgradeBodySchema = z.object({
	plano: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]),
	creditCard: z.object({
		holderName: z.string(),
		number: z.string(),
		expiryMonth: z.string(),
		expiryYear: z.string(),
		ccv: z.string(),
	}),
	creditCardHolderInfo: z.object({
		name: z.string(),
		email: z.string().email(),
		cpfCnpj: z.string(),
		postalCode: z.string().optional(),
		address: z.string().optional(),
		addressNumber: z.string().optional(),
		complement: z.string().optional(),
		province: z.string().optional(),
		city: z.string().optional(),
		phone: z.string(),
	}),
});

export async function upgradePlanoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	const body = upgradeBodySchema.parse(request.body);

	const h = body.creditCardHolderInfo;
	const creditCardHolderInfo = {
		name: h.name,
		email: h.email,
		cpfCnpj: h.cpfCnpj,
		phone: h.phone,
		...(h.postalCode !== undefined && { postalCode: h.postalCode }),
		...(h.address !== undefined && { address: h.address }),
		...(h.addressNumber !== undefined && { addressNumber: h.addressNumber }),
		...(h.complement !== undefined && { complement: h.complement }),
		...(h.province !== undefined && { province: h.province }),
		...(h.city !== undefined && { city: h.city }),
	};

	try {
		const resultado = await upgradePlanoService({
			idusuario: request.user.id,
			planoNovo: body.plano as TipoPlano,
			creditCard: body.creditCard,
			creditCardHolderInfo,
			remoteIp: request.ip || "0.0.0.0",
		});

		return reply.status(200).send(resultado);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		if (message === "Usuário não encontrado") {
			return reply.status(404).send({ message });
		}
		if (
			message.includes("não possui plano") ||
			message.includes("superior") ||
			message.includes("Ciclo")
		) {
			return reply.status(400).send({ message });
		}
		console.error("Erro ao fazer upgrade de plano:", error);
		return reply.status(500).send({
			message: "Erro ao processar upgrade de plano",
			error: message,
		});
	}
}
