import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ORDENAR_TIPOS_COBRANCA_CAMPOS } from "@/repositories/tipo-cobranca-repositories.js";
import { listarTiposCobrancaService } from "@/service/tipo-cobranca/listar-tipos-cobranca.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarTiposCobrancaQuerySchema = z.object({
	idempresa: z.string().min(1),
	codigo: z.string().optional(),
	descricao: z.string().optional(),
	idtipodocumentofinanceiro: z.string().optional(),
	ordenarPor: z.enum(ORDENAR_TIPOS_COBRANCA_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function listarTiposCobranca(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarTiposCobrancaQuerySchema.parse(request.query);
		const resultado = await listarTiposCobrancaService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			codigo: query.codigo,
			descricao: query.descricao,
			idtipodocumentofinanceiro: query.idtipodocumentofinanceiro,
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
