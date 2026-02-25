import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { downgradePlanoService } from "@/service/planos/downgrade-plano.js";
import type { TipoPlano } from "@/constants/planos.js";

const downgradeBodySchema = z.object({
	plano: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]),
});

export async function downgradePlanoController(
	request: FastifyRequest,
	reply: FastifyReply
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	const body = downgradeBodySchema.parse(request.body);

	try {
		const resultado = await downgradePlanoService({
			idusuario: request.user.id,
			planoNovo: body.plano as TipoPlano,
		});

		return reply.status(200).send(resultado);
	} catch (error: any) {
		if (error.message === "Usuário não encontrado") {
			return reply.status(404).send({ message: error.message });
		}
		if (
			error.message.includes("não possui plano") ||
			error.message.includes("inferior") ||
			error.message.includes("Ciclo")
		) {
			return reply.status(400).send({ message: error.message });
		}
		console.error("Erro ao agendar downgrade de plano:", error);
		return reply.status(500).send({
			message: "Erro ao processar downgrade de plano",
			error: error.message,
		});
	}
}

