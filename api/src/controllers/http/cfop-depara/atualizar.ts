import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCfopDeParaService } from "@/service/cfop-depara/atualizar-cfop-depara.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
} from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idcfopentrada: z.string().uuid(),
	idcfopsaida: z.string().uuid(),
	uf: z.string().max(2).optional().nullable(),
});

export async function atualizarCfopDePara(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dadosValidados = bodySchema.parse(request.body);

		const resultado = await atualizarCfopDeParaService({
			id,
			idusuario: request.user.id,
			dados: {
				...dadosValidados,
				uf: dadosValidados.uf?.trim().toUpperCase() || null,
			},
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado.error ?? resultado);
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
