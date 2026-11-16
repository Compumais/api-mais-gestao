import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarRemessaBancaria,
	buscarRemessaBancariaPorIdEempresa,
} from "@/repositories/remessa-bancaria-repositories.js";
import { STATUS_REMESSA_BANCARIA } from "@/util/contrato-constants.js";
import {
	httpBadRequest,
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ idempresa: z.string().min(1) });

export async function marcarRemessaEnviada(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { idempresa } = bodySchema.parse(request.body);
		const pertence = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			idempresa,
		);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const remessa = await buscarRemessaBancariaPorIdEempresa(id, idempresa);
		if (!remessa) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}
		if (remessa.status === STATUS_REMESSA_BANCARIA.CANCELADA) {
			return reply
				.status(httpBadRequest("Remessa cancelada").status)
				.send(httpBadRequest("Remessa cancelada"));
		}

		const atualizada = await atualizarRemessaBancaria(id, {
			status: STATUS_REMESSA_BANCARIA.ENVIADA,
			enviadaem: new Date().toISOString(),
		});

		return reply.status(200).send(atualizada);
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
