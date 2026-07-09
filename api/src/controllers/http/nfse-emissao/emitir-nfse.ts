import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { cancelarNfseService } from "@/service/nfse-emissao/cancelar-nfse.js";
import { consultarNfseService } from "@/service/nfse-emissao/consultar-nfse.js";
import { emitirNfseService } from "@/service/nfse-emissao/emitir-nfse.js";
import { buscarNotaFiscalService } from "@/service/nota-fiscal/buscar-nota-fiscal.js";
import { listarNotasFiscaisService } from "@/service/nota-fiscal/listar-notas-fiscais.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { emitirNfseBodySchema } from "./emissao-nfse-body-schema.js";

const listarNfseQuerySchema = z.object({
	idempresa: z.string().uuid(),
	status: z.coerce.number().optional(),
	page: z.coerce.number().default(1),
	limit: z.coerce.number().default(20),
});

export async function emitirNfse(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = emitirNfseBodySchema.parse(request.body);

		const resultado = await emitirNfseService({
			idusuario: request.user.id,
			...dados,
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

export async function listarNfsesEmitidas(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa, status, page, limit } = listarNfseQuerySchema.parse(
			request.query,
		);

		const resultado = await listarNotasFiscaisService({
			idusuario: request.user.id,
			idempresa,
			status,
			tipoorigem: TIPO_ORIGEM_NFSE,
			page,
			limit,
			rascunho: false,
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

export async function buscarNfsePorId(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

		const resultado = await buscarNotaFiscalService({
			idusuario: request.user.id,
			notaFiscalId: id,
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

export async function cancelarNfse(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const { motivo } = z
			.object({ motivo: z.string().min(15).max(255) })
			.parse(request.body);

		const resultado = await cancelarNfseService({
			idusuario: request.user.id,
			idnotafiscal: id,
			motivo,
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

export async function consultarNfse(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

		const resultado = await consultarNfseService({
			idusuario: request.user.id,
			idnotafiscal: id,
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
