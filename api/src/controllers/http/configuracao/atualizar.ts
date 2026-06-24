import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovaConfiguracao } from "@/model/configuracao-model.js";
import { configuracaoNotificacoesSchema } from "@/schemas/configuracao-notificacoes-schema.js";
import { atualizarConfiguracaoService } from "@/service/configuracao/atualizar-configuracao.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const CAMPOS_CONFIGURACAO = [
	"notificacoes",
	"integracao",
	"relatorios",
	"impressao",
] as const satisfies (keyof NovaConfiguracao)[];

const atualizarConfiguracaoBodySchema = z.object({
	idempresa: z.string().uuid(),
	notificacoes: configuracaoNotificacoesSchema.optional(),
	integracao: z.record(z.string(), z.unknown()).optional(),
	relatorios: z.record(z.string(), z.unknown()).optional(),
	impressao: z.record(z.string(), z.unknown()).optional(),
});

function extrairDadosParciais(
	validado: z.infer<typeof atualizarConfiguracaoBodySchema>,
): Partial<NovaConfiguracao> {
	return Object.fromEntries(
		CAMPOS_CONFIGURACAO.filter((k) => validado[k] !== undefined).map((k) => [
			k,
			validado[k],
		]),
	) as Partial<NovaConfiguracao>;
}

export async function atualizarConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = atualizarConfiguracaoBodySchema.parse(request.body);
		const dados = extrairDadosParciais(dadosValidados);

		const resultado = await atualizarConfiguracaoService({
			idempresa: dadosValidados.idempresa,
			idusuario: request.user.id,
			dados,
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
