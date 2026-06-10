import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirReceitaSemContribuicaoService } from "@/service/receita-sem-contribuicao/excluir-receita-sem-contribuicao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirReceitaSemContribuicaoParamsSchema = z.object({
	id: z.string(),
});

export async function excluirReceitaSemContribuicao(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirReceitaSemContribuicaoParamsSchema.parse(request.params);

		const resultado = await excluirReceitaSemContribuicaoService({
			receitaSemContribuicaoId: id,
			idusuario: request.user.id,
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
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
