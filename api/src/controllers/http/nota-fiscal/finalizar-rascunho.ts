import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	excluirRascunhoImportacaoNfService,
	finalizarRascunhoImportacaoNfService,
} from "@/service/nota-fiscal/importacao/finalizar-rascunho-importacao-nf.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({
	id: z.string(),
});

const finalizarBodySchema = z.object({
	idempresa: z.string(),
	gerarCustos: z.boolean().optional().default(true),
	gerarFinanceiro: z.boolean().optional().default(true),
});

const excluirQuerySchema = z.object({
	idempresa: z.string(),
});

export async function finalizarRascunhoImportacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	let contextoFinalizacao:
		| {
				idRascunho: string;
				idempresa: string;
				gerarCustos: boolean;
				gerarFinanceiro: boolean;
		  }
		| undefined;

	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dados = finalizarBodySchema.parse(request.body);
		contextoFinalizacao = {
			idRascunho: id,
			idempresa: dados.idempresa,
			gerarCustos: dados.gerarCustos,
			gerarFinanceiro: dados.gerarFinanceiro,
		};

		const resultado = await finalizarRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			idRascunho: id,
			gerarCustos: dados.gerarCustos,
			gerarFinanceiro: dados.gerarFinanceiro,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}

		request.log.error(
			{
				err: error,
				idusuario: request.user?.id,
				...contextoFinalizacao,
			},
			"Falha ao finalizar rascunho de nota fiscal de entrada",
		);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function excluirRascunhoImportacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const { idempresa } = excluirQuerySchema.parse(request.query);

		const resultado = await excluirRascunhoImportacaoNfService({
			idusuario: request.user.id,
			idempresa,
			idRascunho: id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(204).send();
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
