import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { resolverContextoEmissaoNfePedidoService } from "@/service/dav/resolver-contexto-emissao-nfe-pedido.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const contextoEmissaoNfeParamsSchema = z.object({
	id: z.string().uuid(),
});

const contextoEmissaoNfeQuerySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function contextoEmissaoNfePedido(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = contextoEmissaoNfeParamsSchema.parse(request.params);
		const { idempresa } = contextoEmissaoNfeQuerySchema.parse(request.query);

		const resultado = await resolverContextoEmissaoNfePedidoService({
			idusuario: request.user.id,
			iddav: id,
			idempresa,
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
