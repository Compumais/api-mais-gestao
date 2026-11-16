import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarGrupoContratoService } from "@/service/grupo-contrato/criar-grupo-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.coerce.number().int().positive(),
	descricao: z.string().trim().min(1).max(120),
});

export async function criarGrupoContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const dados = bodySchema.parse(request.body);
		const resultado = await criarGrupoContratoService({
			dados: { id: uuidv4(), ...dados },
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
