import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { faturarDavNfceService } from "@/service/dav/faturar-dav-nfce.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const faturarDavParamsSchema = z.object({
	id: z.string().uuid(),
});

const faturarDavBodySchema = z.object({
	idempresa: z.string().uuid(),
	gerarFinanceiro: z.boolean().optional().default(true),
	gerarEstoque: z.boolean().optional().default(true),
});

export async function faturarDavNfce(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = faturarDavParamsSchema.parse(request.params);
		const dados = faturarDavBodySchema.parse(request.body);

		const resultado = await faturarDavNfceService({
			idusuario: request.user.id,
			iddav: id,
			...dados,
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
