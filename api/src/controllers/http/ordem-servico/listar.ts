import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarOrdensServicoService } from "@/service/ordem-servico/listar-ordens-servico.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarOrdemServicoQuerySchema = z.object({
	idempresa: z.string().uuid(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	status: z.coerce.number().int().optional(),
	idcliente: z.string().uuid().optional(),
	idultimotecnico: z.string().uuid().optional(),
	codigo: z.coerce.number().int().optional(),
	orcamento: z.coerce.number().int().optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	busca: z.string().optional(),
});

export async function listarOrdemServicos(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarOrdemServicoQuerySchema.parse(request.query);
		const resultado = await listarOrdensServicoService({
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
