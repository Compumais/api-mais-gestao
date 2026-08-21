import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarDavItemService } from "@/service/dav-item/atualizar-dav-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const davItemParamsSchema = z.object({
	id: z.string().uuid(),
	iditem: z.string().uuid(),
});

const rastroSchema = z.object({
	idlote: z.string().uuid().optional().nullable(),
	nLote: z.string().min(1).max(20),
	qLote: z.union([z.string(), z.number()]),
	dFab: z.string().optional().nullable(),
	dVal: z.string().optional().nullable(),
	cAgreg: z.string().max(20).optional().nullable(),
});

const atualizarDavItemBodySchema = z.object({
	quantidade: z.string().optional(),
	preco: z.string().optional(),
	unidademedida: z.string().max(6).optional(),
	idcfop: z.string().uuid().optional().nullable(),
	idproduto: z.string().uuid().optional(),
	rastros: z.array(rastroSchema).optional(),
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
		const body = atualizarDavItemBodySchema.parse(request.body);
		const { rastros, ...resto } = body;
		const dados = removerUndefined(resto);

		const resultado = await atualizarDavItemService({
			iddav: id,
			iditem,
			idusuario: request.user.id,
			dados,
			rastros,
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
