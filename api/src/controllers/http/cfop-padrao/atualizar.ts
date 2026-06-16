import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCfopPadraoService } from "@/service/cfop-padrao/atualizar-cfop-padrao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarCfopPadraoParamsSchema = z.object({
	id: z.string(),
});

const atualizarCfopPadraoBodySchema = z.object({
	finalidade: z.string().max(1024).optional(),
	nome: z.string().max(1024).optional(),
	codigo: z.string().max(20).optional(),
	inativo: z.number().int().optional()
});

export async function atualizarCfopPadrao(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarCfopPadraoParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarCfopPadraoBodySchema.parse(request.body),
		);

		const resultado = await atualizarCfopPadraoService({
			cfopPadraoId: id,
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
