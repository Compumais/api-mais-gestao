import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarPlanoContasService } from "../../../service/planocontas/buscar-plano-contas";

const buscarPlanoContasParamsSchema = z.object({
	id: z.uuid(),
});

export async function buscarPlanoContas(
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

		const idusuario = request.user.id;
		const { id } = buscarPlanoContasParamsSchema.parse(request.params);

		const resultado = await buscarPlanoContasService({
			idplanocontas: id,
			idusuario,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		console.log(resultado.body);

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
			error: "Erro ao buscar plano de contas",
			code: "GET_PLANO_CONTAS_ERROR",
		});
	}
}
