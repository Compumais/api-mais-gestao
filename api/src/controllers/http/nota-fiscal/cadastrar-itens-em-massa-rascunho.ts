import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { cadastrarItensEmMassaRascunhoImportacaoNfService } from "@/service/nota-fiscal/importacao/cadastrar-itens-em-massa-rascunho-importacao-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idsItens: z.array(z.string().uuid()).optional(),
});

export async function cadastrarItensEmMassaRascunhoImportacao(
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

		const { id } = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await cadastrarItensEmMassaRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idRascunho: id,
			idsItens: body.idsItens,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}

		return reply.status(resultado.status).send({
			quantidadeCadastrados: resultado.body?.quantidadeCadastrados ?? 0,
			quantidadeIgnorados: resultado.body?.quantidadeIgnorados ?? 0,
			ignorados: resultado.body?.ignorados ?? [],
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
