import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirClienteService } from "../../service/clientes/excluir-cliente";

const excluirClienteParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function excluirCliente(
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
		const { id } = excluirClienteParamsSchema.parse(request.params);

		const resultado = await excluirClienteService({
			clienteId: id,
			userId,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.message,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir cliente",
			code: "DELETE_CLIENTE_ERROR",
		});
	}
}

