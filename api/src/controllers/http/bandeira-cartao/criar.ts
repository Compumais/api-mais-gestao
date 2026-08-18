import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarBandeiraCartaoService } from "@/service/bandeira-cartao/criar-bandeira-cartao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarBandeiraCartaoBodySchema = z.object({
	idempresa: z.string().uuid(),
	descricao: z.string().min(1).max(60),
	codigo: z.string().max(30).optional().nullable(),
	inativo: z.coerce.number().int().min(0).max(1).optional(),
});

export async function criarBandeiraCartao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarBandeiraCartaoBodySchema.parse(request.body);

		const resultado = await criarBandeiraCartaoService({
			dadosBandeiraCartao: {
				id: uuidv4(),
				idempresa: dadosValidados.idempresa,
				descricao: dadosValidados.descricao.trim(),
				codigo: dadosValidados.codigo?.trim() || null,
				inativo: dadosValidados.inativo ?? 0,
				currenttimemillis: Date.now(),
			},
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
