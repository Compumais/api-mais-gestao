import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	ativarCertificadoDigitalService,
	criarCertificadoDigitalService,
	excluirCertificadoDigitalService,
	listarCertificadosDigitaisService,
} from "@/service/certificado-digital/certificado-digital.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const queryEmpresaSchema = z.object({
	idempresa: z.string().uuid(),
});

const criarBodySchema = z.object({
	idempresa: z.string().uuid(),
	apelido: z.string().min(1).max(100),
	senha: z.string().min(1),
	arquivopfxBase64: z.string().min(1),
});

const paramsIdSchema = z.object({
	id: z.string().uuid(),
});

export async function listarCertificadosDigitais(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = queryEmpresaSchema.parse(request.query);

		const resultado = await listarCertificadosDigitaisService({
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

export async function criarCertificadoDigital(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = criarBodySchema.parse(request.body);

		const resultado = await criarCertificadoDigitalService({
			...dados,
			idusuario: request.user.id,
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

export async function ativarCertificadoDigital(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsIdSchema.parse(request.params);
		const { idempresa } = queryEmpresaSchema.parse(request.query);

		const resultado = await ativarCertificadoDigitalService({
			id,
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

export async function excluirCertificadoDigital(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsIdSchema.parse(request.params);
		const { idempresa } = queryEmpresaSchema.parse(request.query);

		const resultado = await excluirCertificadoDigitalService({
			id,
			idempresa,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
