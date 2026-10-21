import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import {
	ORIGEM_TIPO_APROPRIACAO,
	REGIME_APROPRIACAO,
} from "@/constants/centro-custo.js";
import { salvarApropriacoesCentroCustoService } from "@/service/apropriacao-centro-custo/salvar-apropriacoes-centro-custo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string(),
	regime: z.enum([
		REGIME_APROPRIACAO.COMPETENCIA,
		REGIME_APROPRIACAO.CAIXA,
	]),
	valorTotal: z.coerce.number().positive(),
	datalancamento: z.string(),
	idplanocontas: z.string().optional().nullable(),
	referenciaexterna: z.string().max(120).optional().nullable(),
	linhas: z.array(
		z.object({
			idcentrocusto: z.string(),
			valor: z.coerce.number().optional(),
			percentual: z.coerce.number().optional().nullable(),
		}),
	),
	idcriteriorateio: z.string().optional().nullable(),
});

export async function criarApropriacaoManual(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const body = bodySchema.parse(request.body);
		const origemid = uuidv4();
		const resultado = await salvarApropriacoesCentroCustoService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			origemtipo: ORIGEM_TIPO_APROPRIACAO.MANUAL,
			origemid,
			regime: body.regime,
			linhas: body.linhas,
			idcriteriorateio: body.idcriteriorateio,
			referenciaexterna: body.referenciaexterna,
			valorTotalManual: body.valorTotal,
			datalancamentoManual: body.datalancamento,
			idplanocontasManual: body.idplanocontas ?? null,
			auditoriaAcao: "criar_apropriacao_manual_centro_custo",
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send({
			origemid,
			resultado: resultado.body,
		});
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
