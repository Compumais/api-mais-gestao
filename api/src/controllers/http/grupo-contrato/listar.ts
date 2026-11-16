import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_GRUPOS_CONTRATO_CAMPOS } from "@/repositories/grupo-contrato-repositories.js";
import { listarGruposContratoService } from "@/service/grupo-contrato/listar-grupos-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.string().optional(),
	descricao: z.string().optional(),
	ordenarPor: z.enum(ORDENAR_GRUPOS_CONTRATO_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function listarGruposContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const query = querySchema.parse(request.query);
		const resultado = await listarGruposContratoService({
			idusuario: request.user.id,
			...query,
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
