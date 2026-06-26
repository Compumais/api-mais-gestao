import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { importPurchaseInvoiceService } from "@/service/nfe-inbound/import-purchase-invoice.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
} from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
});

export async function importarDocumentoNfeInbound(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = paramsSchema.parse(request.params);
		const body = bodySchema.parse(request.body);

		const resultado = await importPurchaseInvoiceService({
			idDocumento: params.id,
			idempresa: body.idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply
				.status(resultado.status)
				.send("error" in resultado ? resultado.error : httpErroInterno());
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
