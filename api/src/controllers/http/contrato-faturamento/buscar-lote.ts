import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { listarCobrancasPorLote } from "@/repositories/contrato-cobranca-repositories.js";
import { buscarContratoFaturamentoLotePorIdEempresa } from "@/repositories/contrato-faturamento-lote-repositories.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().min(1) });
const querySchema = z.object({ idempresa: z.string().min(1) });

export async function buscarLoteFaturamento(
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

		const lote = await buscarContratoFaturamentoLotePorIdEempresa(id, idempresa);
		if (!lote) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		const cobrancas = await listarCobrancasPorLote(lote.id);
		return reply.status(200).send({ lote, cobrancas });
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
