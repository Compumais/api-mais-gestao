import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCotacaoCompraService } from "@/service/cotacoes-compra/atualizar-cotacao-compra.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });
const itemSchema = z.object({
	idproduto: z.string().uuid().nullish(),
	descricao: z.string().trim().max(120).nullish(),
	quantidade: z.string().min(1),
	unidademedida: z.string().max(6).nullish(),
	observacao: z.string().nullish(),
	ordem: z.number().int().optional(),
});
const bodySchema = z.object({
	titulo: z.string().min(1).max(120).optional(),
	observacao: z.string().nullish(),
	validade: z.string().nullish(),
	itens: z.array(itemSchema).min(1).optional(),
});

export async function atualizarCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);
		const resultado = await atualizarCotacaoCompraService({
			id,
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
		return reply.status(500).send({
			error: "Erro ao atualizar cotação de compra",
			code: "UPDATE_COTACAO_COMPRA_ERROR",
		});
	}
}
