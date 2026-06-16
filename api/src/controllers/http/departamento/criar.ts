import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarDepartamentoService } from "@/service/departamento/criar-departamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarDepartamentoBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().max(20),
	descricao: z.string().max(12),
	inativo: z.number().int().optional()
});

export async function criarDepartamento(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarDepartamentoBodySchema.parse(request.body);

		const dadosDepartamento = {
			id: uuidv4(),
			...dadosValidados,
			idusuariocadastro: request.user.id,
			idultimousuarioalteracao: request.user.id,
		};

		const resultado = await criarDepartamentoService({
			dadosDepartamento,
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
