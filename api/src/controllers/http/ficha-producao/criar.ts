import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarFichaProducaoService } from "@/service/ficha-producao/criar-ficha-producao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const itemSchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string().min(1),
	ordem: z.number().int().optional(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	idprodutoacabado: z.string().uuid(),
	permiteproducaomassa: z.boolean(),
	producaonavenda: z.boolean(),
	observacao: z.string().nullable().optional(),
	itens: z.array(itemSchema).min(1),
});

export async function criarFichaProducao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await criarFichaProducaoService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idprodutoacabado: body.idprodutoacabado,
			permiteproducaomassa: body.permiteproducaomassa,
			producaonavenda: body.producaonavenda,
			observacao: body.observacao,
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
