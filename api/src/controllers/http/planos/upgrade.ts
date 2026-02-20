import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { upgradePlanoService } from "@/service/planos/upgrade-plano";
import type { TipoPlano } from "@/constants/planos";

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
	reply: FastifyReply
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	const body = upgradeBodySchema.parse(request.body);

	try {
		const resultado = await upgradePlanoService({
			idusuario: request.user.id,
			planoNovo: body.plano as TipoPlano,
			creditCard: body.creditCard,
			creditCardHolderInfo: body.creditCardHolderInfo,
			remoteIp: request.ip || "0.0.0.0",
		});

		return reply.status(200).send(resultado);
	} catch (error: any) {
		if (error.message === "Usuário não encontrado") {
			return reply.status(404).send({ message: error.message });
		}
		if (
			error.message.includes("não possui plano") ||
			error.message.includes("superior") ||
			error.message.includes("Ciclo")
		) {
			return reply.status(400).send({ message: error.message });
		}
		console.error("Erro ao fazer upgrade de plano:", error);
		return reply.status(500).send({
			message: "Erro ao processar upgrade de plano",
			error: error.message,
		});
	}
}

