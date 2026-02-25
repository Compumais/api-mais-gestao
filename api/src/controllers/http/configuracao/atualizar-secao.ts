import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarConfiguracaoParcial } from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

const atualizarSecaoParamsSchema = z.object({
	idempresa: z.string(),
	secao: z.enum(["notificacoes", "integracao", "relatorios", "impressao"]),
});

const atualizarSecaoBodySchema = z.object({});

export async function atualizarSecaoConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = atualizarSecaoParamsSchema.parse(request.params);
		const dados = atualizarSecaoBodySchema.parse(request.body);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			params.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const configuracao = await atualizarConfiguracaoParcial({
			idempresa: params.idempresa,
			secao: params.secao,
			dados: dados as Record<string, unknown>,
		});

		return reply.status(200).send(configuracao);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao atualizar seção de configurações",
			code: "UPDATE_SECAO_CONFIGURACAO_ERROR",
		});
	}
}
