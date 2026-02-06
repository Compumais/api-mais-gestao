import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarConfiguracaoPorEmpresa } from "@/repositories/configuracao-repositories";
import { atualizarConfiguracaoParcial } from "@/repositories/configuracao-repositories";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories";
import { httpNaoAutorizado, httpNaoEncontrado, httpProibido, httpOk } from "@/util/http-util";

const atualizarWebhookParamsSchema = z.object({
	idempresa: z.string(),
	webhookId: z.string(),
});

const atualizarWebhookBodySchema = z.object({
	url: z.string().url("URL inválida").optional(),
	eventos: z.array(z.string()).optional(),
	ativo: z.boolean().optional(),
});

export async function atualizarWebhook(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const params = atualizarWebhookParamsSchema.parse(request.params);
		const body = atualizarWebhookBodySchema.parse(request.body);

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
			webhooks?: Array<{
				id: string;
				url?: string;
				eventos?: string[];
				ativo?: boolean;
			}>;
		}) || { webhooks: [] };

		const webhooks = integracao.webhooks || [];
		const webhookIndex = webhooks.findIndex(
			(w) => w.id === params.webhookId,
		);

		if (webhookIndex === -1) {
			return reply.status(httpNaoEncontrado().status).send({
				error: "Webhook não encontrado",
				code: "WEBHOOK_NOT_FOUND",
			});
		}

		webhooks[webhookIndex] = {
			...webhooks[webhookIndex],
			...(body.url && { url: body.url }),
			...(body.eventos && { eventos: body.eventos }),
			...(body.ativo !== undefined && { ativo: body.ativo }),
		};

		await atualizarConfiguracaoParcial({
			idempresa: params.idempresa,
			secao: "integracao",
			dados: {
				webhooks,
			},
		});

		return reply.status(200).send(httpOk(webhooks[webhookIndex]));
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
			error: "Erro ao atualizar webhook",
			code: "UPDATE_WEBHOOK_ERROR",
		});
	}
}

