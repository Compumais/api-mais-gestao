import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarFichaProducaoService } from "@/service/ficha-producao/atualizar-ficha-producao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const itemSchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string().min(1),
	ordem: z.number().int().optional(),
});

const bodySchema = z.object({
	idprodutoacabado: z.string().uuid().optional(),
	permiteproducaomassa: z.boolean().optional(),
	producaonavenda: z.boolean().optional(),
	observacao: z.string().nullable().optional(),
	ativo: z.boolean().optional(),
	itens: z.array(itemSchema).min(1).optional(),
});

export async function atualizarFichaProducao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await atualizarFichaProducaoService({
			id: params.id,
			idusuario: request.user.id,
			...body,
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
