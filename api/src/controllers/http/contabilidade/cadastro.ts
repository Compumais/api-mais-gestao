import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	buscarContabilidadeCadastroService,
	salvarContabilidadeCadastroService,
} from "@/service/contabilidade/cadastro-contabilidade.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const querySchema = z.object({
	idempresa: z.string().uuid(),
});

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	nome: z.string().min(1).max(200),
	cnpj: z.string().max(18).nullable().optional(),
	emailprincipal: z.string().email().max(200),
	emailsadicionais: z.array(z.string().email()).max(10).nullable().optional(),
	ativo: z.boolean().optional(),
});

export async function buscarCadastroContabilidade(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { idempresa } = querySchema.parse(request.query);
		const resultado = await buscarContabilidadeCadastroService({
			idusuario: request.user.id,
			idempresa,
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

export async function salvarCadastroContabilidade(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = bodySchema.parse(request.body);
		const resultado = await salvarContabilidadeCadastroService({
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
