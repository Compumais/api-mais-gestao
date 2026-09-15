import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	importarTabelaIbptService,
	statusTabelaIbptService,
} from "@/service/ibpt/importar-tabela-ibpt.js";
import {
	httpErroInterno,
	httpNaoAutorizado,
	httpProibido,
} from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

const importarIbptBodySchema = z.object({
	uf: z.string().length(2),
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
		const pertence = await verificarUsuarioPertenceEmpresa(request.user.id, id);
		if (!pertence) {
			return reply.status(httpProibido().status).send(httpProibido());
		}

		const dados = importarIbptBodySchema.parse(request.body);

		const resultado = await importarTabelaIbptService({
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
		const query = z.object({ uf: z.string().length(2) }).parse(request.query);

		const pertence = await verificarUsuarioPertenceEmpresa(request.user.id, id);
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
