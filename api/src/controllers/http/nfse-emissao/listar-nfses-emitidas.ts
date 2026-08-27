import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { ORDENAR_NOTAS_FISCAIS_CAMPOS } from "@/repositories/nota-fiscal-repositories.js";
import { listarNotasFiscaisService } from "@/service/nota-fiscal/listar-notas-fiscais.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarNfseQuerySchema = z.object({
	idempresa: z.string().uuid(),
	status: z.coerce.number().optional(),
	numero: z.string().optional(),
	numeronfse: z.string().optional(),
	razaosocial: z.string().optional(),
	dataInicio: z.string().optional(),
	dataFim: z.string().optional(),
	ordenarPor: z.enum(ORDENAR_NOTAS_FISCAIS_CAMPOS).optional(),
	ordem: z.enum(["asc", "desc"]).optional(),
	page: z.coerce.number().default(1),
	limit: z.coerce.number().default(20),
});

export async function listarNfsesEmitidas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = listarNfseQuerySchema.parse(request.query);

		const resultado = await listarNotasFiscaisService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			status: query.status,
			numero: query.numero,
			numeronfse: query.numeronfse,
			razaosocial: query.razaosocial,
			dataInicio: query.dataInicio,
			dataFim: query.dataFim,
			ordenarPor: query.ordenarPor,
			ordem: query.ordem,
			tipoorigem: TIPO_ORIGEM_NFSE,
			page: query.page,
			limit: query.limit,
			rascunho: false,
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
