import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarDavItemService } from "@/service/dav-item/atualizar-dav-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const davItemParamsSchema = z.object({
	id: z.string().uuid(),
	iditem: z.string().uuid(),
});

const atualizarDavItemBodySchema = z.object({
	quantidade: z.string().optional(),
	preco: z.string().optional(),
	unidademedida: z.string().max(6).optional(),
	idcfop: z.string().uuid().optional().nullable(),
	idproduto: z.string().uuid().optional(),
});

export async function atualizarDavItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id, iditem } = davItemParamsSchema.parse(request.params);
		const dados = removerUndefined(atualizarDavItemBodySchema.parse(request.body));

		const resultado = await atualizarDavItemService({
			iddav: id,
			iditem,
			idusuario: request.user.id,
			dados,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
