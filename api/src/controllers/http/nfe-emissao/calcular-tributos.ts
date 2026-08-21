import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { calcularTributosItensEmissaoNfeService } from "@/service/nfe-emissao/calcular-tributos-itens-emissao-nfe.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { calcularTributosNfeBodySchema } from "./emissao-nfe-body-schema.js";

export async function calcularTributosNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = calcularTributosNfeBodySchema.parse(request.body);
		const resultado = await calcularTributosItensEmissaoNfeService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			itens: dados.itens,
			totais: dados.totais,
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
