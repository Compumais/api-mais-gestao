import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarTipoCobrancaService } from "@/service/tipo-cobranca/criar-tipo-cobranca.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarTipoCobrancaBodySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.coerce.number().int().positive(),
	descricao: z.string().trim().min(1).max(120),
	idtipodocumentofinanceiro: z.string().min(1),
});

export async function criarTipoCobranca(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarTipoCobrancaBodySchema.parse(request.body);

		const resultado = await criarTipoCobrancaService({
			dadosTipoCobranca: {
				id: uuidv4(),
				...dadosValidados,
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
