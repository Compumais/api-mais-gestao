import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarTipoDocumentoFinanceiroService } from "@/service/tipo-documento-financeiro/atualizar-tipo-documento-financeiro.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarTipoDocumentoFinanceiroParamsSchema = z.object({
	id: z.string(),
});

const atualizarTipoDocumentoFinanceiroBodySchema = z.object({
	descricao: z.string().max(50).optional(),
	acao: z.number().int().optional(),
	inativo: z.number().int().optional()
});

export async function atualizarTipoDocumentoFinanceiro(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarTipoDocumentoFinanceiroParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarTipoDocumentoFinanceiroBodySchema.parse(request.body),
		);

		const resultado = await atualizarTipoDocumentoFinanceiroService({
			tipoDocumentoFinanceiroId: id,
			idusuario: request.user.id,
			dados,
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
