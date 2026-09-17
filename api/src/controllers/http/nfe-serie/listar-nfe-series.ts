import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarNfeSeriesService } from "@/service/nfe-serie/nfe-serie.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryEmpresaSchema = z.object({
	idempresa: z.string().uuid(),
	modelo: z.string().max(2).optional(),
	ambiente: z.coerce.number().int().min(1).max(2).optional(),
});

export async function listarNfeSeries(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa, modelo, ambiente } = queryEmpresaSchema.parse(
			request.query,
		);

		const resultado = await listarNfeSeriesService({
			idempresa,
			idusuario: request.user.id,
			...(modelo ? { modelo } : {}),
			...(ambiente ? { ambiente: ambiente as 1 | 2 } : {}),
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
