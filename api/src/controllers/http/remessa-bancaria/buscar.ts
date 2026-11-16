import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarRemessaBancariaPorIdEempresa,
	listarItensRemessa,
} from "@/repositories/remessa-bancaria-repositories.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({ idempresa: z.string().min(1) });

export async function buscarRemessaBancaria(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { idempresa } = querySchema.parse(request.query);
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

		const itens = await listarItensRemessa(remessa.id);
		return reply.status(200).send({ remessa, itens });
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
