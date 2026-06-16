import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarSaldoEstoqueService } from "@/service/saldo-estoque/buscar-saldo-estoque.js";

const buscarSaldoEstoqueParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

export async function buscarSaldoEstoque(
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
		const { id } = buscarSaldoEstoqueParamsSchema.parse(request.params);

		const resultado = await buscarSaldoEstoqueService({
			saldoEstoqueId: id,
			idusuario,
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
			error: "Erro ao buscar saldo de estoque",
			code: "GET_SALDO_ESTOQUE_ERROR",
		});
	}
}
