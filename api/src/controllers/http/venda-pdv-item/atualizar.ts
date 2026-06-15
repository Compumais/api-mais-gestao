import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovoVendaPdvItem } from "@/model/venda-pdv-item-model.js";
import { atualizarVendaPdvItemService } from "@/service/venda-pdv-item/atualizar-venda-pdv-item.js";import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const atualizarVendaPdvItemParamsSchema = z.object({
	id: z.string(),
});

const atualizarVendaPdvItemBodySchema = z.object({
	idempresa: z.string().optional(),
	idvenda: z.string().optional(),
	idproduto: z.string().optional(),
	quantidade: z.string().optional(),
	precounitario: z.string().optional(),
	precototal: z.string().optional(),
	precopromocao: z.string().optional(),
	precoalterado: z.string().optional(),
	taxaservico: z.number().int().optional(),
});

export async function atualizarVendaPdvItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarVendaPdvItemParamsSchema.parse(request.params);
		const dadosValidados = atualizarVendaPdvItemBodySchema.parse(request.body);
		const dados = Object.fromEntries(
			Object.entries(dadosValidados).filter(
				(entry): entry is [string, string | number] => entry[1] !== undefined,
			),
		) as Partial<NovoVendaPdvItem>;

		const resultado = await atualizarVendaPdvItemService({			vendaPdvItemId: id,
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
