import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarTaxaUfService } from "@/service/taxauf/atualizar-taxauf.js";
import { taxaUfAtualizacaoBodySchema } from "@/util/taxauf-body-schema.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarTaxaUfQuerySchema = z.object({
	idempresa: z.string(),
});

export async function atualizarTaxaUf(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = request.params as { id: string };
		const query = atualizarTaxaUfQuerySchema.parse(request.query);
		const dadosValidados = taxaUfAtualizacaoBodySchema.parse(request.body);

		const resultado = await atualizarTaxaUfService({
			id,
			idusuario: request.user.id,
			idempresa: query.idempresa,
			dados: dadosValidados as Parameters<
				typeof atualizarTaxaUfService
			>[0]["dados"],
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
