import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarNfeConfiguracaoService,
	buscarNfeConfiguracaoService,
} from "@/service/nfe-configuracao/buscar-nfe-configuracao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });

const bodySchema = z.object({
	ambiente: z.number().int().min(1).max(2).optional(),
	idcertificadoativo: z.string().uuid().nullable().optional(),
	tokenibpt: z.string().max(100).nullable().optional(),
	emailenvioxml: z.string().max(200).nullable().optional(),
	infresptec_cnpj: z.string().max(14).nullable().optional(),
	infresptec_nome: z.string().max(60).nullable().optional(),
	infresptec_email: z.string().max(200).nullable().optional(),
	infresptec_fone: z.string().max(20).nullable().optional(),
	contingenciaativa: z.boolean().optional(),
	contingenciajson: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function buscarNfeConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);

		const resultado = await buscarNfeConfiguracaoService({
			idempresa: id,
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

export async function atualizarNfeConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const dados = bodySchema.parse(request.body);

		const resultado = await atualizarNfeConfiguracaoService({
			idempresa: id,
			idusuario: request.user.id,
			dados: dados as Parameters<typeof atualizarNfeConfiguracaoService>[0]["dados"],
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
