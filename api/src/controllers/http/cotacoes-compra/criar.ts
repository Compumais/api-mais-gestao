import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarCotacaoCompraService } from "@/service/cotacoes-compra/criar-cotacao-compra.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const itemSchema = z.object({
	idproduto: z.string().uuid().nullish(),
	descricao: z.string().trim().max(120).nullish(),
	quantidade: z.string().min(1),
	unidademedida: z.string().max(6).nullish(),
	observacao: z.string().nullish(),
	ordem: z.number().int().optional(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	titulo: z.string().min(1).max(120),
	observacao: z.string().nullish(),
	validade: z.string().nullish(),
	itens: z.array(itemSchema).min(1),
});

export async function criarCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await criarCotacaoCompraService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			titulo: body.titulo,
			observacao: body.observacao,
			validade: body.validade,
			itens: body.itens,
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
