import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirCfopDeParaService } from "@/service/cfop-depara/excluir-cfop-depara.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const excluirCfopDeParaParamsSchema = z.object({
	id: z.string().uuid(),
});

const excluirCfopDeParaQuerySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function excluirCfopDePara(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = excluirCfopDeParaParamsSchema.parse(request.params);
		const { idempresa } = excluirCfopDeParaQuerySchema.parse(request.query);

		const resultado = await excluirCfopDeParaService({
			id,
			idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
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
