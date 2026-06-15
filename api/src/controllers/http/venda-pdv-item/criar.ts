import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarVendaPdvItemService } from "@/service/venda-pdv-item/criar-venda-pdv-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarVendaPdvItemBodySchema = z.object({
	idempresa: z.string(),
	idvenda: z.string(),
	idproduto: z.string(),
	quantidade: z.string(),
	precounitario: z.string(),
	precototal: z.string(),
	precopromocao: z.string(),
	precoalterado: z.string(),
	taxaservico: z.number().int().optional(),
});

export async function criarVendaPdvItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarVendaPdvItemBodySchema.parse(request.body);

		const resultado = await criarVendaPdvItemService({
			dadosVendaPdvItem: { id: uuidv4(), ...dadosValidados },
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
