import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarReceitaSemContribuicaoService } from "@/service/receita-sem-contribuicao/criar-receita-sem-contribuicao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarReceitaSemContribuicaoBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().max(16).optional(),
	descricao: z.string().max(100).optional()
});

export async function criarReceitaSemContribuicao(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarReceitaSemContribuicaoBodySchema.parse(request.body);

		const dadosReceitaSemContribuicao = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarReceitaSemContribuicaoService({
			dadosReceitaSemContribuicao,
			idusuario: request.user.id,
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
