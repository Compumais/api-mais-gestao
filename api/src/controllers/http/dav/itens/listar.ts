import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { listarDavItensService } from "@/service/dav-item/listar-dav-itens.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const davItemParamsSchema = z.object({
	id: z.string().uuid(),
});

export async function listarDavItens(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = davItemParamsSchema.parse(request.params);

		const resultado = await listarDavItensService({
			iddav: id,
			idusuario: request.user.id,
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
