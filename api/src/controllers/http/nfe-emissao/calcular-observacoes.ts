import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { calcularObservacoesLegaisNfeService } from "@/service/nfe-emissao/calcular-observacoes-legais-nfe.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { itemNfeSchema } from "./emissao-nfe-body-schema.js";

const calcularObservacoesNfeBodySchema = z.object({
	idempresa: z.string().uuid(),
	informacoesAdicionais: z.string().max(2000).optional(),
	itens: z.array(itemNfeSchema).min(1),
});

export async function calcularObservacoesNfe(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dados = calcularObservacoesNfeBodySchema.parse(request.body);
		const resultado = await calcularObservacoesLegaisNfeService({
			idusuario: request.user.id,
			idempresa: dados.idempresa,
			informacoesAdicionais: dados.informacoesAdicionais,
			itens: dados.itens,
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
