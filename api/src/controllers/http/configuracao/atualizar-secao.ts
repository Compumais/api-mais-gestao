import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { atualizarSecaoConfiguracaoService } from "@/service/configuracao/atualizar-secao-configuracao.js";
import { httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

const atualizarSecaoParamsSchema = z.object({
	idempresa: z.string().uuid(),
	secao: z.enum(["notificacoes", "integracao", "relatorios", "impressao"]),
});

export async function atualizarSecaoConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = atualizarSecaoParamsSchema.parse(request.params);

		const resultado = await atualizarSecaoConfiguracaoService({
			idempresa: params.idempresa,
			idusuario: request.user.id,
			secao: params.secao,
			dados: request.body,
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
			error: "Erro ao atualizar seção de configurações",
			code: "UPDATE_SECAO_CONFIGURACAO_ERROR",
		});
	}
}
