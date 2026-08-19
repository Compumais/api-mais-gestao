import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { alterarProdutosEmMassaService } from "@/service/produto/alterar-produtos-em-massa.js";
import { alterarProdutosEmMassaBodySchema } from "@/util/campos-alteracao-em-massa-produto.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

export async function alterarProdutosEmMassa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send({
				error: httpNaoAutorizado().error,
				code: httpNaoAutorizado().code,
			});
		}

		const body = alterarProdutosEmMassaBodySchema.parse(request.body);

		const resultado = await alterarProdutosEmMassaService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			ids: body.ids,
			campos: body.campos,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}

		return reply.status(resultado.status).send({
			atualizados: resultado.body?.atualizados ?? 0,
			erros: resultado.body?.erros ?? 0,
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
