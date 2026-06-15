import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovoContaMesaItem } from "@/model/conta-mesa-item-model.js";
import { atualizarContaMesaItemService } from "@/service/conta-mesa-item/atualizar-conta-mesa-item.js";import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarContaMesaItemParamsSchema = z.object({
	id: z.string(),
});

const atualizarContaMesaItemBodySchema = z.object({
	idproduto: z.string().optional(),
	idcontamesa: z.string().optional(),
	idgarcom: z.string().optional(),
	nomeproduto: z.string().max(120).optional(),
	quantidade: z.string().optional(),
	precopromocao: z.string().optional(),
	precoalterado: z.string().optional(),
	precounitario: z.string().optional(),
	unidademedida: z.string().max(6).optional(),
	couverartistico: z.number().int().optional(),
	observacao: z.string().optional(),
	taxaservico: z.number().int().optional(),
});

export async function atualizarContaMesaItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarContaMesaItemParamsSchema.parse(request.params);
		const dadosValidados = atualizarContaMesaItemBodySchema.parse(request.body);
		const dados = Object.fromEntries(
			Object.entries(dadosValidados).filter(
				(entry): entry is [string, string | number] => entry[1] !== undefined,
			),
		) as Partial<NovoContaMesaItem>;

		const resultado = await atualizarContaMesaItemService({			contaMesaItemId: id,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
