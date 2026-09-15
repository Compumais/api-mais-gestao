import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { cancelarVendaNaoFiscalPdvService } from "@/service/venda-pdv-gourmet/cancelar-venda-nao-fiscal-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	motivo: z.string().max(255).optional().nullable(),
});

export async function cancelarVendaNaoFiscalPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { idempresa, motivo } = bodySchema.parse(request.body);

		const resultado = await cancelarVendaNaoFiscalPdvService({
			idvenda: id,
			idempresa,
			idusuario: request.user.id,
			motivo,
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
