import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { obterTributacaoSugeridaPorCfop } from "@/service/produto/enriquecer-campos-impostos-produto.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
	idcfop: z.string().uuid(),
});

export async function tributacaoPorCfop(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa, idcfop } = querySchema.parse(request.query);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const tributacao = await obterTributacaoSugeridaPorCfop(idempresa, idcfop);

		if (!tributacao) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		return reply.status(200).send(tributacao);
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
