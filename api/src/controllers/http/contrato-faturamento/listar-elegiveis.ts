import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarContratosElegiveisFaturamentoService } from "@/service/contrato/listar-contratos-elegiveis-faturamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	competencia: z.string().min(7).max(7),
	somenteElegiveis: z
		.union([z.literal("true"), z.literal("false"), z.boolean()])
		.optional(),
});

export async function listarElegiveisFaturamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const resultado = await listarContratosElegiveisFaturamentoService({
			idempresa: query.idempresa,
			idusuario: request.user.id,
			competencia: query.competencia,
			somenteElegiveis:
				query.somenteElegiveis === true || query.somenteElegiveis === "true",
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
