import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarContratoCobrancas } from "@/repositories/contrato-cobranca-repositories.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	idcontrato: z.string().optional(),
	competencia: z.string().optional(),
	idlote: z.string().optional(),
	statusfaturamento: z.string().optional(),
	page: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
});

export async function listarCobrancasFaturamento(
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
		const limit = query.limit ?? 50;
		const resultado = await listarContratoCobrancas({
			...query,
			page,
			limit,
		});

		return reply.status(200).send({
			data: resultado.cobrancas,
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
