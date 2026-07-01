import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarFatorConversaoService } from "@/service/fator-conversao/atualizar-fator-conversao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarFatorConversaoParamsSchema = z.object({
	id: z.string(),
});

const atualizarFatorConversaoBodySchema = z.object({
	nome: z.string().min(1).max(100).optional(),
	fator: z
		.string()
		.min(1)
		.refine((valor) => {
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero) && numero > 0;
		}, "Fator deve ser maior que zero")
		.optional(),
});

export async function atualizarFatorConversao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarFatorConversaoParamsSchema.parse(request.params);
		const dados = atualizarFatorConversaoBodySchema.parse(request.body);

		const resultado = await atualizarFatorConversaoService({
			fatorConversaoId: id,
			idusuario: request.user.id,
			dados: {
				...(dados.nome !== undefined && { nome: dados.nome }),
				...(dados.fator !== undefined && {
					fator: dados.fator.replace(",", "."),
				}),
			},
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
