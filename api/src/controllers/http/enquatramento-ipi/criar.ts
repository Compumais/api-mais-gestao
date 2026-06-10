import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarEnquatramentoIpiService } from "@/service/enquatramento-ipi/criar-enquatramento-ipi.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarEnquatramentoIpiBodySchema = z.object({
	idempresa: z.string(),
	codigo: z.string().max(20),
	descricao: z.string().max(100),
	grupocst: z.string().max(20)
});

export async function criarEnquatramentoIpi(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarEnquatramentoIpiBodySchema.parse(request.body);

		const dadosEnquatramentoIpi = {
			id: uuidv4(),
			...dadosValidados,
			datacadastro: new Date().toISOString(),
		dataultimaalteracao: new Date().toISOString(),
		};

		const resultado = await criarEnquatramentoIpiService({
			dadosEnquatramentoIpi,
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
