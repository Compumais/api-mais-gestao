import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarControlePlanoContasService } from "@/service/dashboard/buscar-dados-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid().optional(),
	ano: z.coerce.number().min(2000).max(2100).optional(),
});

export async function buscarControlePlanoContas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await buscarControlePlanoContasService({
			idusuario: request.user.id,
			...(query.idempresa && { idempresa: query.idempresa }),
			...(query.ano !== undefined && { ano: query.ano }),
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
		return reply.status(500).send({
			error: "Erro ao buscar controle de plano de contas",
			code: "CONTROLE_PLANO_CONTAS_ERROR",
		});
	}
}
