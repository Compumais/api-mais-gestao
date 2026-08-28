import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	importarTabelaIbptService,
	statusTabelaIbptService,
} from "@/service/ibpt/importar-tabela-ibpt.js";
import { httpErroInterno, httpNaoAutorizado, httpProibido } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

const importarIbptBodySchema = z.object({
	conteudo: z.union([z.string().min(1), z.record(z.string(), z.unknown())]),
	uf: z.string().length(2).optional(),
});

export async function importarTabelaIbpt(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const pertence = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			id,
		);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const dados = importarIbptBodySchema.parse(request.body);
		const conteudo =
			typeof dados.conteudo === "string"
				? JSON.parse(dados.conteudo)
				: dados.conteudo;

		const resultado = await importarTabelaIbptService({
			conteudo,
			uf: dados.uf,
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
		if (error instanceof SyntaxError) {
			return reply.status(400).send({
				error: "Arquivo IBPT inválido (JSON malformado)",
				code: "INVALID_JSON",
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function statusTabelaIbpt(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const query = z
			.object({ uf: z.string().length(2) })
			.parse(request.query);

		const pertence = await verificarUsuarioPertenceEmpresa(
			request.user.id,
			id,
		);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const resultado = await statusTabelaIbptService(query.uf);

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
