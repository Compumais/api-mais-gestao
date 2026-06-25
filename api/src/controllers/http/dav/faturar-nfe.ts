import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { faturarDavNfeService } from "@/service/dav/faturar-dav-nfe.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const faturarDavParamsSchema = z.object({
	id: z.string().uuid(),
});

const faturarDavBodySchema = z.object({
	idempresa: z.string().uuid(),
	idserienfe: z.string().uuid().optional(),
	confirmarProducao: z.boolean().optional().default(false),
	gerarFinanceiro: z.boolean().optional().default(true),
	gerarEstoque: z.boolean().optional().default(true),
});

export async function faturarDavNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = faturarDavParamsSchema.parse(request.params);
		const dados = faturarDavBodySchema.parse(request.body);

		const resultado = await faturarDavNfeService({
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
