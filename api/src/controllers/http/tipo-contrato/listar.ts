import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_TIPOS_CONTRATO_CAMPOS } from "@/repositories/tipo-contrato-repositories.js";
import { listarTiposContratoService } from "@/service/tipo-contrato/listar-tipos-contrato.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarTiposContratoQuerySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.string().optional(),
	descricao: z.string().optional(),
	ordenarPor: z.enum(ORDENAR_TIPOS_CONTRATO_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function listarTiposContrato(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarTiposContratoQuerySchema.parse(request.query);
		const resultado = await listarTiposContratoService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			codigo: query.codigo,
			descricao: query.descricao,
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
			page: query.page,
			limit: query.limit,
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
