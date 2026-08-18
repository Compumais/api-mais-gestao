import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarBandeiraCartaoService } from "@/service/bandeira-cartao/atualizar-bandeira-cartao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarBandeiraCartaoParamsSchema = z.object({
	id: z.string(),
});

const atualizarBandeiraCartaoBodySchema = z.object({
	descricao: z.string().min(1).max(60).optional(),
	codigo: z.string().max(30).optional().nullable(),
	inativo: z.coerce.number().int().min(0).max(1).optional(),
});

export async function atualizarBandeiraCartao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarBandeiraCartaoParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarBandeiraCartaoBodySchema.parse(request.body),
		);

		const resultado = await atualizarBandeiraCartaoService({
			bandeiraCartaoId: id,
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
