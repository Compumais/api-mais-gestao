import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarVendaPdvPorIdentidadeLocalService } from "@/service/venda-pdv-gourmet/buscar-venda-pdv-por-identidade-local.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	numeropdv: z.coerce.number().int().positive(),
	idvendalocal: z.string().uuid(),
});

export async function buscarVendaPdvPorIdentidadeLocal(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const query = querySchema.parse(request.query);
		const resultado = await buscarVendaPdvPorIdentidadeLocalService({
			idusuario: request.user.id,
			...query,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
