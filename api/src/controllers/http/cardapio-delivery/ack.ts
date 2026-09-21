import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { ackPedidoCardapioDeliveryService } from "@/service/cardapio-delivery/ack-pedido-cardapio.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.uuid() });
const querySchema = z.object({ idempresa: z.string().min(1) });
const bodySchema = z.object({
	sucesso: z.boolean(),
	idcontamensalocal: z.string().nullable().optional(),
	mensagemerro: z.string().max(500).nullable().optional(),
});

export async function ackPedidoCardapioDelivery(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const { id } = paramsSchema.parse(request.params);
		const { idempresa } = querySchema.parse(request.query);
		const body = bodySchema.parse(request.body);
		const resultado = await ackPedidoCardapioDeliveryService({
			id,
			idempresa,
			idusuario: request.user.id,
			sucesso: body.sucesso,
			idcontamensalocal: body.idcontamensalocal,
			mensagemerro: body.mensagemerro,
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
