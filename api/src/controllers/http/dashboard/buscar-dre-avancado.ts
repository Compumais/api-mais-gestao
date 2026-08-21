import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod/v4";
import { buscarDreAvancadoService } from "@/service/dashboard/buscar-analytics-dashboard.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid().optional(),
	granularidade: z.enum(["ano", "trimestre", "mes"]).optional(),
	ano: z.coerce.number().min(2000).max(2100).optional(),
	mes: z.coerce.number().min(1).max(12).optional(),
	trimestre: z.coerce.number().min(1).max(4).optional(),
});

export async function buscarDreAvancado(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const resultado = await buscarDreAvancadoService({
			idusuario: request.user.id,
			...(query.idempresa && { idempresa: query.idempresa }),
			...(query.granularidade && { granularidade: query.granularidade }),
			...(query.ano !== undefined && { ano: query.ano }),
			...(query.mes !== undefined && { mes: query.mes }),
			...(query.trimestre !== undefined && { trimestre: query.trimestre }),
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
			error: "Erro ao buscar DRE avançado",
			code: "DRE_AVANCADO_ERROR",
		});
	}
}
