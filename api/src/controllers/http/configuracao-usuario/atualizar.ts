import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarConfiguracaoUsuarioService } from "@/service/configuracao-usuario/atualizar-configuracao-usuario.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const atualizarConfiguracaoUsuarioBodySchema = z.object({
	geminiApiKey: z.string().nullable().optional(),
	openaiApiKey: z.string().nullable().optional(),
	openrouterApiKey: z.string().nullable().optional(),
	asaasToken: z.string().nullable().optional(),
});

export async function atualizarConfiguracaoUsuario(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = atualizarConfiguracaoUsuarioBodySchema.parse(request.body);

		// Apenas o próprio usuário pode atualizar suas configurações
		// O idusuario vem do token de autenticação (request.user.id)
		// Não permitimos que um usuário atualize configurações de outro usuário

		const resultado = await atualizarConfiguracaoUsuarioService({
			idusuario: request.user.id,
			dados: {
				geminiApiKey: dados.geminiApiKey ?? null,
				openaiApiKey: dados.openaiApiKey ?? null,
				openrouterApiKey: dados.openrouterApiKey ?? null,
				asaasToken: dados.asaasToken ?? null,
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
			error: "Erro ao atualizar configurações do usuário",
			code: "UPDATE_CONFIGURACAO_USUARIO_ERROR",
		});
	}
}
