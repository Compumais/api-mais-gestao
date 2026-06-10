import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarCfopPadraoService } from "@/service/cfop-padrao/criar-cfop-padrao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarCfopPadraoBodySchema = z.object({
	idempresa: z.string(),
	finalidade: z.string().max(1024),
	nome: z.string().max(1024),
	codigo: z.string().max(20),
	inativo: z.number().int().optional()
});

export async function criarCfopPadrao(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarCfopPadraoBodySchema.parse(request.body);

		const dadosCfopPadrao = {
			id: uuidv4(),
			...dadosValidados,
		};

		const resultado = await criarCfopPadraoService({
			dadosCfopPadrao,
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
