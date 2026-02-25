import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarConfiguracaoParcial,
	buscarConfiguracaoPorEmpresa,
} from "@/repositories/configuracao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	httpNaoAutorizado,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

const deletarChaveApiParamsSchema = z.object({
	idempresa: z.string(),
	chaveId: z.string(),
});

export async function deletarChaveApi(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = deletarChaveApiParamsSchema.parse(request.params);

		const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			params.idempresa,
		);

		if (!usuarioPertenceEmpresa) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const configuracao = await buscarConfiguracaoPorEmpresa({
			idempresa: params.idempresa,
		});

		if (!configuracao) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		const integracao = (configuracao.integracao as {
			apis?: {
				chaves?: Array<{
					id: string;
					nome: string;
					chave: string;
					criadoEm: string;
					ultimoUso: string | null;
					ativo: boolean;
				}>;
			};
		}) || { apis: { chaves: [] } };

		const chaves = integracao.apis?.chaves || [];
		const chavesFiltradas = chaves.filter(
			(chave) => chave.id !== params.chaveId,
		);

		await atualizarConfiguracaoParcial({
			idempresa: params.idempresa,
			secao: "integracao",
			dados: {
				apis: {
					chaves: chavesFiltradas,
				},
			},
		});

		return reply
			.status(200)
			.send(httpOk({ message: "Chave deletada com sucesso" }));
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
			error: "Erro ao deletar chave de API",
			code: "DELETE_API_KEY_ERROR",
		});
	}
}
