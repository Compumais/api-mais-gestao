import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarDavItemService } from "@/service/dav-item/criar-dav-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const rastroSchema = z.object({
	idlote: z.string().uuid().optional().nullable(),
	nLote: z.string().min(1).max(20),
	qLote: z.union([z.string(), z.number()]),
	dFab: z.string().optional().nullable(),
	dVal: z.string().optional().nullable(),
	cAgreg: z.string().max(20).optional().nullable(),
});

const criarDavItemBodySchema = z.object({
	idproduto: z.string().uuid(),
	quantidade: z.string(),
	preco: z.string(),
	unidademedida: z.string().max(6).optional(),
	idcfop: z.string().uuid().optional(),
	rastros: z.array(rastroSchema).optional(),
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
			rastros: dados.rastros,
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
