import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarNfseSerieService,
	criarNfseSerieService,
	listarNfseSeriesService,
} from "@/service/nfse-serie/nfse-serie.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryEmpresaSchema = z.object({
	idempresa: z.string().uuid(),
});

const criarBodySchema = z.object({
	idempresa: z.string().uuid(),
	serie: z.string().min(1).max(5),
	numeroproximo: z.number().int().min(1).optional(),
	padrao: z.boolean().optional(),
	ativo: z.boolean().optional(),
});

const atualizarBodySchema = criarBodySchema
	.omit({ idempresa: true })
	.partial()
	.extend({ idempresa: z.string().uuid() });

export async function listarNfseSeries(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = queryEmpresaSchema.parse(request.query);

		const resultado = await listarNfseSeriesService({
			idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function criarNfseSerie(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = criarBodySchema.parse(request.body);

		const resultado = await criarNfseSerieService({
			idempresa: dados.idempresa,
			idusuario: request.user.id,
			dados: {
				serie: dados.serie,
				...(dados.numeroproximo !== undefined
					? { numeroproximo: dados.numeroproximo }
					: {}),
				...(dados.padrao !== undefined ? { padrao: dados.padrao } : {}),
				...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
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
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function atualizarNfseSerie(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const dados = atualizarBodySchema.parse(request.body);
		const { idempresa, ...resto } = dados;

		const resultado = await atualizarNfseSerieService({
			id,
			idempresa,
			idusuario: request.user.id,
			dados: resto,
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
