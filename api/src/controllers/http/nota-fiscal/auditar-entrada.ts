import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { aplicarRevalidacaoProdutosNotaService } from "@/service/nota-fiscal/importacao/aplicar-revalidacao-produtos-nota.js";
import {
	auditarEntradaNfConfirmadaService,
	revalidarProdutosNotaConfirmadaService,
} from "@/service/nota-fiscal/importacao/auditar-entrada-nf-confirmada.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string(),
	limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export async function auditarEntradaNf(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = querySchema.parse(request.query);
		const resultado = await auditarEntradaNfConfirmadaService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			limit: query.limit,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

const revalidarParamsSchema = z.object({
	id: z.string(),
});

const revalidarQuerySchema = z.object({
	idempresa: z.string(),
});

export async function revalidarProdutosNota(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = revalidarParamsSchema.parse(request.params);
		const { idempresa } = revalidarQuerySchema.parse(request.query);
		const resultado = await revalidarProdutosNotaConfirmadaService({
			idusuario: request.user.id,
			idempresa,
			idnotafiscal: id,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

const aplicarRevalidacaoBodySchema = z.object({
	idempresa: z.string().min(1),
	escopo: z.literal("nota"),
});

export async function aplicarRevalidacaoProdutosNota(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = revalidarParamsSchema.parse(request.params);
		const { idempresa } = aplicarRevalidacaoBodySchema.parse(request.body);
		const resultado = await aplicarRevalidacaoProdutosNotaService({
			idusuario: request.user.id,
			idempresa,
			idnotafiscal: id,
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
