import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarContaMesaItemService } from "@/service/conta-mesa-item/criar-conta-mesa-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarContaMesaItemBodySchema = z.object({
	idproduto: z.string(),
	idcontamesa: z.string(),
	idgarcom: z.string(),
	nomeproduto: z.string().max(120),
	quantidade: z.string(),
	precopromocao: z.string(),
	precoalterado: z.string(),
	precounitario: z.string(),
	unidademedida: z.string(),
	couverartistico: z.number().int().optional(),
	observacao: z.string().optional(),
	taxaservico: z.number().int().optional(),
});

export async function criarContaMesaItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarContaMesaItemBodySchema.parse(request.body);

		const resultado = await criarContaMesaItemService({
			dadosContaMesaItem: { id: uuidv4(), ...dadosValidados },
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
