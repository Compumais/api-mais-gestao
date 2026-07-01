import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarFatorConversaoService } from "@/service/fator-conversao/criar-fator-conversao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarFatorConversaoBodySchema = z.object({
	idempresa: z.string(),
	nome: z.string().min(1).max(100),
	fator: z
		.string()
		.min(1)
		.refine((valor) => {
			const numero = Number.parseFloat(valor.replace(",", "."));
			return !Number.isNaN(numero) && numero > 0;
		}, "Fator deve ser maior que zero"),
});

export async function criarFatorConversao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarFatorConversaoBodySchema.parse(request.body);

		const resultado = await criarFatorConversaoService({
			dadosFatorConversao: {
				id: uuidv4(),
				idempresa: dadosValidados.idempresa,
				nome: dadosValidados.nome,
				fator: dadosValidados.fator.replace(",", "."),
			},
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
