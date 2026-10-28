import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarCentroCustoService } from "@/service/centro-custo/atualizar-centro-custo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { removerUndefined } from "@/util/remover-undefined.js";

const atualizarCentroCustoParamsSchema = z.object({
	id: z.string(),
});

const atualizarCentroCustoBodySchema = z.object({
	nome: z.string().max(50).optional(),
	codigoextenso: z.string().max(85).optional(),
	codigoreduzido: z.string().max(20).optional(),
	inativo: z.coerce.number().int().min(0).max(1).optional(),
	obrigatorio: z.coerce.number().int().optional(),
	idcentrocustopai: z.string().optional(),
	descricao: z.string().optional().nullable(),
	iddepartamento: z.string().optional().nullable(),
	idresponsavel: z.string().optional().nullable(),
	datainiciovigencia: z.string().optional().nullable(),
	datafimvigencia: z.string().optional().nullable(),
	tipogestao: z.string().length(3).optional().nullable(),
	observacao: z.string().optional().nullable(),
});

export async function atualizarCentroCusto(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = atualizarCentroCustoParamsSchema.parse(request.params);
		const dados = removerUndefined(
			atualizarCentroCustoBodySchema.parse(request.body),
		);

		const resultado = await atualizarCentroCustoService({
			centroCustoId: id,
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
