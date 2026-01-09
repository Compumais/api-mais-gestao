import type { FastifyReply, FastifyRequest, FastifySchema } from "fastify";
import z from "zod";
import { buscarClienteService } from "../../../service/clientes/buscar-cliente";

const buscarClienteParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function buscarCliente(
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

		const userId = request.user.id;
		const { id } = buscarClienteParamsSchema.parse(request.params);

		const resultado = await buscarClienteService({
			clienteId: id,
			userId,
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
			error: "Erro ao buscar cliente",
			code: "GET_CLIENTE_ERROR",
		});
	}
}
