import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarContratosService } from "@/service/contrato/listar-contratos.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().min(1),
	descricao: z.string().optional(),
	codigo: z.string().optional(),
	situacao: z.string().optional(),
	identidade: z.string().optional(),
	fluxofaturamento: z.coerce.number().optional(),
	ordenarPor: z
		.enum(["codigo", "descricao", "situacao", "datainicio", "valor", "criadoem"])
		.optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
});

export async function listarContratos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const filtros = querySchema.parse(request.query);
		const resultado = await listarContratosService({
			...filtros,
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
