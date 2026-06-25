import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { excluirDavItemService } from "@/service/dav-item/excluir-dav-item.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const davItemParamsSchema = z.object({
	id: z.string().uuid(),
	iditem: z.string().uuid(),
});

export async function excluirDavItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id, iditem } = davItemParamsSchema.parse(request.params);

		const resultado = await excluirDavItemService({
			iddav: id,
			iditem,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
