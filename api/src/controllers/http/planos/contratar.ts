import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { TipoPlano } from "@/constants/planos.js";
import { criarPlanoService } from "@/service/planos/criar-plano.js";

const contratarBodySchema = z.object({
	plano: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]),
	ciclo: z.enum(["MONTHLY"]).default("MONTHLY"),
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
		postalCode: z.string().nullable(),
		address: z.string().nullable(),
		addressNumber: z.string().nullable(),
		complement: z.string().nullable(),
		province: z.string().nullable(),
		city: z.string().nullable(),
		phone: z.string(),
	}),
});

export async function contratarPlanoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Usuário já garantido pelo hook de autenticação

	if (request.user!.plano != null) {
		return reply.status(400).send({
			message:
				"Usuário já possui um plano ativo. Use upgrade para alterar o plano.",
		});
	}

	const body = contratarBodySchema.parse(request.body);

	const h = body.creditCardHolderInfo;
	const creditCardHolderInfo = {
		name: h.name,
		email: h.email,
		cpfCnpj: h.cpfCnpj,
		phone: h.phone,
		...(h.postalCode != null && { postalCode: h.postalCode }),
		...(h.address != null && { address: h.address }),
		...(h.addressNumber != null && { addressNumber: h.addressNumber }),
		...(h.complement != null && { complement: h.complement }),
		...(h.province != null && { province: h.province }),
		...(h.city != null && { city: h.city }),
	};

	try {
		const resultado = await criarPlanoService({
			idusuario: request.user!.id,
			plano: body.plano as TipoPlano,
			ciclo: body.ciclo,
			creditCard: body.creditCard,
			creditCardHolderInfo,
			remoteIp: request.ip ?? "0.0.0.0",
		});

		return reply.status(201).send(resultado);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);

		const errorMap: Record<string, number> = {
			"Usuário não encontrado": 404,
			"Usuário já possui um plano ativo": 400,
		};

		const statusCode = errorMap[message];

		if (statusCode) {
			return reply.status(statusCode).send({ message });
		}

		console.error("Erro ao contratar plano:", error);

		return reply.status(500).send({
			message: "Erro ao processar contratação de plano",
			error: message,
		});
	}
}
