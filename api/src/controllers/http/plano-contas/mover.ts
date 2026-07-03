import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { moverPlanoContasService } from "@/service/planocontas/mover-plano-contas.js";

const moverPlanoContasSchema = z.object({
	id: z.uuid(),
	idplanocontasdestino: z.uuid().nullable(),
});

export async function moverPlanoContas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const dadosValidados = moverPlanoContasSchema.parse(request.body);

		const resultado = await moverPlanoContasService({
			id: dadosValidados.id,
			idusuario: request.user.id,
			roles: request.user.roles,
			idplanocontasdestino: dadosValidados.idplanocontasdestino,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);

		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}

		return reply.status(500).send({
			error: "Erro ao mover plano de contas",
			code: "MOVE_PLANO_CONTAS_ERROR",
		});
	}
}
