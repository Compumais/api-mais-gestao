import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { downgradePlanoService } from "@/service/planos/downgrade-plano.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

const downgradeBodySchema = z.object({
	plano: z.string().min(1),
});

export async function downgradePlanoController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	if (!normalizarPerfilArray(request.user.roles).includes("proprietario")) {
		return reply.status(403).send({
			message: "Apenas proprietários podem fazer downgrade de plano",
		});
	}

	const body = downgradeBodySchema.parse(request.body);

	try {
		const resultado = await downgradePlanoService({
			idusuario: request.user.id,
			planoNovo: body.plano,
		});

		return reply.status(200).send(resultado);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		if (message === "Usuário não encontrado") {
			return reply.status(404).send({ message });
		}
		if (
			message.includes("não possui plano") ||
			message.includes("downgrade") ||
			message.includes("inválido") ||
			message.includes("Ciclo")
		) {
			return reply.status(400).send({ message });
		}
		console.error("Erro ao agendar downgrade de plano:", error);
		return reply.status(500).send({
			message: "Erro ao processar downgrade de plano",
			error: message,
		});
	}
}
