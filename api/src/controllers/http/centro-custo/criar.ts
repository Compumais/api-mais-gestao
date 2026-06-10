import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarCentroCustoService } from "@/service/centro-custo/criar-centro-custo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarCentroCustoBodySchema = z.object({
	idempresa: z.string(),
	nome: z.string().max(50),
	codigoextenso: z.string().max(85).optional(),
	codigoreduzido: z.string().max(20).optional(),
	inativo: z.number().int().optional(),
	obrigatorio: z.number().int().optional(),
	idcentrocustopai: z.string().optional()
});

export async function criarCentroCusto(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarCentroCustoBodySchema.parse(request.body);

		const dadosCentroCusto = {
			id: uuidv4(),
			...dadosValidados,
			currenttimemillis: Date.now(),
		datacadastro: new Date().toISOString().split("T")[0],
		dataultimaalteracao: new Date().toISOString().split("T")[0],
		idusuariocadastro: request.user.id,
		idultimousuarioalteracao: request.user.id,
		};

		const resultado = await criarCentroCustoService({
			dadosCentroCusto,
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
