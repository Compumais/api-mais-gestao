import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	listarClassificacoesIbsCbs,
	normalizarCstIbsCbs,
} from "@/util/catalogo-ibs-cbs.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	cst: z.string().optional(),
	documento: z.enum(["nfe", "nfce", "todos"]).optional().default("nfe"),
});

export async function listarClassificacoesIbsCbsHttp(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);

		const data = listarClassificacoesIbsCbs({
			cst: normalizarCstIbsCbs(query.cst),
			documento: query.documento,
			somenteVigentes: false,
		});

		return reply.status(200).send({ data });
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
