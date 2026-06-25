import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarTipoDocumentoFinanceiroService } from "@/service/tipo-documento-financeiro/criar-tipo-documento-financeiro.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarTipoDocumentoFinanceiroBodySchema = z.object({
	idempresa: z.string(),
	descricao: z.string().max(50),
	acao: z.number().int(),
	inativo: z.number().int().optional(),
	formapagamentonfe: z.string().optional().nullable(),
	idplanocontas: z.string().uuid().optional().nullable(),
	aprazo: z.number().int().min(0).max(1).optional(),
	prazodias: z.number().int().min(0).optional().nullable(),
	currenttimemillis: z.number().int().optional(),
});

export async function criarTipoDocumentoFinanceiro(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarTipoDocumentoFinanceiroBodySchema.parse(request.body);

		const dadosTipoDocumentoFinanceiro = {
			id: uuidv4(),
			...dadosValidados,
			currenttimemillis: Date.now(),
		};

		const resultado = await criarTipoDocumentoFinanceiroService({
			dadosTipoDocumentoFinanceiro,
			idusuario: request.user.id,
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
