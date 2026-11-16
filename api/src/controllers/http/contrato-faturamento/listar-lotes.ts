import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarContratoFaturamentoLotes } from "@/repositories/contrato-faturamento-lote-repositories.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	competencia: z.string().optional(),
	status: z.string().optional(),
	page: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
});

export async function listarLotesFaturamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const pertence = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			query.idempresa,
		);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const resultado = await listarContratoFaturamentoLotes({
			...query,
			page,
			limit,
		});

		return reply.status(200).send({
			data: resultado.lotes,
			paginacao: {
				page,
				limit,
				total: resultado.total,
				totalPages: Math.ceil(resultado.total / limit) || 1,
			},
		});
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
