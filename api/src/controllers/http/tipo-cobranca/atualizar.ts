import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarTipoCobrancaService } from "@/service/tipo-cobranca/atualizar-tipo-cobranca.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarTipoCobrancaParamsSchema = z.object({
	id: z.string().min(1),
});

const atualizarTipoCobrancaBodySchema = z
	.object({
		codigo: z.coerce.number().int().positive().optional(),
		descricao: z.string().trim().min(1).max(120).optional(),
		idtipodocumentofinanceiro: z.string().min(1).optional(),
	})
	.refine(
		(dados) => Object.values(dados).some((valor) => valor !== undefined),
		{
			message: "Informe ao menos um campo para atualização",
		},
	);

export async function atualizarTipoCobranca(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarTipoCobrancaParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarTipoCobrancaBodySchema.parse(request.body),
		);
		const resultado = await atualizarTipoCobrancaService({
			tipoCobrancaId: id,
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
