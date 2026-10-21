import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	ORIGEM_TIPO_APROPRIACAO,
	REGIME_APROPRIACAO,
} from "@/constants/centro-custo.js";
import { salvarApropriacoesCentroCustoService } from "@/service/apropriacao-centro-custo/salvar-apropriacoes-centro-custo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
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
	regime: z.enum([
		REGIME_APROPRIACAO.COMPETENCIA,
		REGIME_APROPRIACAO.CAIXA,
	]),
	linhas: z.array(
		z.object({
			idcentrocusto: z.string(),
			valor: z.coerce.number().optional(),
			percentual: z.coerce.number().optional().nullable(),
		}),
	),
	idcriteriorateio: z.string().optional().nullable(),
});

export async function reclassificarApropriacaoHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const body = bodySchema.parse(request.body);
		const resultado = await salvarApropriacoesCentroCustoService({
			idusuario: request.user.id,
			...body,
			auditoriaAcao: "reclassificar_apropriacao_centro_custo",
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
