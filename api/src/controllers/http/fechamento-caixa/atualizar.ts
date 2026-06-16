import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarFechamentoCaixaService } from "@/service/fechamento-caixa/atualizar-fechamento-caixa.js";

const valorMonetarioSchema = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.optional()
	.nullable();

const atualizarFechamentoCaixaParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

const atualizarFechamentoCaixaBodySchema = z.object({
	codigo: z.string().max(10).optional().nullable(),
	datahora: z.string().optional().nullable(),
	falta: valorMonetarioSchema,
	idoperacao: z.number().int().optional().nullable(),
	idusuario: z.string().uuid().optional().nullable(),
	idusuariofechamento: z.string().uuid().optional().nullable(),
	idusuariosuprimento: z.string().uuid().optional().nullable(),
	local: z.number().int().optional().nullable(),
	novofechamento: z.number().int().optional().nullable(),
	observacao: z.string().optional().nullable(),
	pdv: z.number().int().optional().nullable(),
	saldoapurado: valorMonetarioSchema,
	saldoconferido: valorMonetarioSchema,
	saldoinformado: valorMonetarioSchema,
	sobra: valorMonetarioSchema,
	status: z.number().int().optional().nullable(),
	suprimentoinicial: valorMonetarioSchema,
});

export async function atualizarFechamentoCaixa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const idusuario = request.user.id;
		const { id } = atualizarFechamentoCaixaParamsSchema.parse(request.params);
		const dados = atualizarFechamentoCaixaBodySchema.parse(request.body);

		const resultado = await atualizarFechamentoCaixaService({
			fechamentoCaixaId: id,
			idusuario,
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
		return reply.status(500).send({
			error: "Erro ao atualizar fechamento de caixa",
			code: "UPDATE_FECHAMENTO_CAIXA_ERROR",
		});
	}
}
