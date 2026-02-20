import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { criarPlanoService } from "@/service/planos/criar-plano";
import type { TipoPlano } from "@/constants/planos";

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
		postalCode: z.string().optional(),
		address: z.string().optional(),
		addressNumber: z.string().optional(),
		complement: z.string().optional(),
		province: z.string().optional(),
		city: z.string().optional(),
		phone: z.string(),
	}),
});

export async function contratarPlanoController(
	request: FastifyRequest,
	reply: FastifyReply
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	// Validar que usuário não possui plano
	if (request.user.plano !== null && request.user.plano !== undefined) {
		return reply.status(400).send({
			message: "Usuário já possui um plano ativo. Use upgrade para alterar o plano.",
		});
	}

	const body = contratarBodySchema.parse(request.body);

	try {
		const resultado = await criarPlanoService({
			idusuario: request.user.id,
			plano: body.plano as TipoPlano,
			ciclo: body.ciclo,
			creditCard: body.creditCard,
			creditCardHolderInfo: body.creditCardHolderInfo,
			remoteIp: request.ip || "0.0.0.0",
		});

		return reply.status(201).send(resultado);
	} catch (error: any) {
		if (error.message === "Usuário não encontrado") {
			return reply.status(404).send({ message: error.message });
		}
		if (error.message === "Usuário já possui um plano ativo") {
			return reply.status(400).send({ message: error.message });
		}
		console.error("Erro ao contratar plano:", error);
		return reply.status(500).send({
			message: "Erro ao processar contratação de plano",
			error: error.message,
		});
	}
}

