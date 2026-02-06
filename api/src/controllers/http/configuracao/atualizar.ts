import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarConfiguracaoService } from "@/service/configuracao/atualizar-configuracao";
import { httpNaoAutorizado } from "@/util/http-util";

const atualizarConfiguracaoBodySchema = z.object({
	idempresa: z.string(),
	notificacoes: z.record(z.unknown()).optional(),
	integracao: z.record(z.unknown()).optional(),
	relatorios: z.record(z.unknown()).optional(),
	impressao: z.record(z.unknown()).optional(),
});

export async function atualizarConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = atualizarConfiguracaoBodySchema.parse(
			request.body,
		);

		const resultado = await atualizarConfiguracaoService({
			idempresa: dadosValidados.idempresa,
			idusuario: request.user.id,
			dados: {
				notificacoes: dadosValidados.notificacoes,
				integracao: dadosValidados.integracao,
				relatorios: dadosValidados.relatorios,
				impressao: dadosValidados.impressao,
			},
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
		return reply.status(500).send({
			error: "Erro ao atualizar configurações",
			code: "UPDATE_CONFIGURACAO_ERROR",
		});
	}
}

