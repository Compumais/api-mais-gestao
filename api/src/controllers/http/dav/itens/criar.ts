import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarDavItemService } from "@/service/dav-item/criar-dav-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const criarDavItemBodySchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string(),
	preco: z.string(),
	unidademedida: z.string().max(6).optional(),
	idcfop: z.string().uuid().optional(),
});

const davItemParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function criarDavItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = davItemParamsSchema.parse(request.params);
		const dados = criarDavItemBodySchema.parse(request.body);

		const resultado = await criarDavItemService({
			iddav: id,
			idusuario: request.user.id,
			dadosItem: {
				idproduto: dados.idproduto,
				quantidade: dados.quantidade,
				preco: dados.preco,
				unidademedida: dados.unidademedida,
				idcfop: dados.idcfop,
			},
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
