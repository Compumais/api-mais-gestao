import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarNfseConfiguracaoService,
	buscarNfseConfiguracaoService,
} from "@/service/nfse-configuracao/nfse-configuracao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const paramsEmpresaSchema = z.object({
	id: z.string().uuid(),
});

const urlsOperacaoSchema = z
	.object({
		emissao: z.string().nullable().optional(),
		consulta: z.string().nullable().optional(),
		cancelamento: z.string().nullable().optional(),
	})
	.nullable()
	.optional();

const atualizarBodySchema = z.object({
	ambiente: z.number().int().min(1).max(2).optional(),
	provedor: z.string().optional(),
	codigomunicipioibge: z.string().nullable().optional(),
	versaolayout: z.string().optional(),
	urlwsdl: z.string().nullable().optional(),
	urlsoperacao: urlsOperacaoSchema,
	usarlotesincrono: z.boolean().optional(),
	idcertificadoativo: z.string().uuid().nullable().optional(),
	ultimaidserie: z.string().uuid().nullable().optional(),
});

export async function buscarNfseConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsEmpresaSchema.parse(request.params);

		const resultado = await buscarNfseConfiguracaoService({
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

export async function atualizarNfseConfiguracao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsEmpresaSchema.parse(request.params);
		const dados = atualizarBodySchema.parse(request.body);

		const resultado = await atualizarNfseConfiguracaoService({
			idempresa: id,
			idusuario: request.user.id,
			dados,
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
