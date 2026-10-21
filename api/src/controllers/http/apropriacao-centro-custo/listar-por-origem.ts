import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	ORIGEM_TIPO_APROPRIACAO,
	REGIME_APROPRIACAO,
} from "@/constants/centro-custo.js";
import { listarApropriacoesPorOrigem } from "@/repositories/apropriacao-centro-custo-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string(),
	origemtipo: z.enum([
		ORIGEM_TIPO_APROPRIACAO.FINANCEIRO,
		ORIGEM_TIPO_APROPRIACAO.FINANCEIRO_LANCAMENTO,
		ORIGEM_TIPO_APROPRIACAO.CONTA_CORRENTE_LANCAMENTO,
		ORIGEM_TIPO_APROPRIACAO.NOTA_FISCAL,
		ORIGEM_TIPO_APROPRIACAO.ORDEM_SERVICO,
		ORIGEM_TIPO_APROPRIACAO.MANUAL,
	]),
	origemid: z.string(),
	regime: z
		.enum([REGIME_APROPRIACAO.COMPETENCIA, REGIME_APROPRIACAO.CAIXA])
		.optional(),
});

export async function listarApropriacoesPorOrigemHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const query = querySchema.parse(request.query);
		const permitido = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			query.idempresa,
		);
		if (!permitido) {
			return reply.status(httpProibido().status).send(httpProibido());
		}
		const data = await listarApropriacoesPorOrigem(query);
		return reply.status(200).send({ data });
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
