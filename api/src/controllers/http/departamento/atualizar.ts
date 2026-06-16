import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarDepartamentoService } from "@/service/departamento/atualizar-departamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarDepartamentoParamsSchema = z.object({
	id: z.string(),
});

const atualizarDepartamentoBodySchema = z.object({
	codigo: z.string().max(20).optional(),
	descricao: z.string().max(12).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarDepartamento(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarDepartamentoParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarDepartamentoBodySchema.parse(request.body),
		);

		const resultado = await atualizarDepartamentoService({
			departamentoId: id,
			idusuario: request.user.id,
			dados,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
