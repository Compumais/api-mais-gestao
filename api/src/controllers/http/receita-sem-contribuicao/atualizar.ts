import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarReceitaSemContribuicaoService } from "@/service/receita-sem-contribuicao/atualizar-receita-sem-contribuicao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarReceitaSemContribuicaoParamsSchema = z.object({
	id: z.string(),
});

const atualizarReceitaSemContribuicaoBodySchema = z.object({
	codigo: z.string().max(16).optional(),
	descricao: z.string().max(100).optional()
});

export async function atualizarReceitaSemContribuicao(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarReceitaSemContribuicaoParamsSchema.parse(request.params);
		const dados = atualizarReceitaSemContribuicaoBodySchema.parse(request.body);

		const resultado = await atualizarReceitaSemContribuicaoService({
			receitaSemContribuicaoId: id,
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
