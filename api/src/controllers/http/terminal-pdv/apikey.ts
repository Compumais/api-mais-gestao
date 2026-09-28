import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	autenticarDevicePdvService,
	gerarApiKeyTerminalPdvService,
} from "@/service/terminal-pdv/apikey-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsIdSchema = z.object({
	id: z.string().uuid(),
});

const gerarBodySchema = z.object({
	idempresa: z.string().uuid(),
});

const deviceAuthBodySchema = z.object({
	apiKey: z.string().min(10),
	instanceId: z.string().min(8).max(120),
	forcar: z.boolean().optional(),
});

export async function gerarApiKeyTerminalPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}
		const params = paramsIdSchema.parse(request.params);
		const body = gerarBodySchema.parse(request.body);
		const resultado = await gerarApiKeyTerminalPdvService({
			id: params.id,
			idempresa: body.idempresa,
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

export async function autenticarDevicePdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const body = deviceAuthBodySchema.parse(request.body);
		const resultado = await autenticarDevicePdvService(body);
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
