import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarFechamentoCaixaService } from "@/service/fechamento-caixa/criar-fechamento-caixa.js";

const valorMonetarioSchema = z
	.union([z.string(), z.number()])
	.transform((value) => String(value))
	.optional()
	.nullable();

const criarFechamentoCaixaBodySchema = z.object({
	idempresa: z.string().uuid(),
	codigo: z.string().max(10).optional().nullable(),
	datahora: z.string().optional().nullable(),
	falta: valorMonetarioSchema,
	idoperacao: z.number().int().optional().nullable(),
	idusuario: z.string().optional().nullable(),
	idusuariofechamento: z.string().optional().nullable(),
	idusuariosuprimento: z.string().optional().nullable(),
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

export async function criarFechamentoCaixa(
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
		const dadosFechamentoCaixa =
			criarFechamentoCaixaBodySchema.parse(request.body);

		const resultado = await criarFechamentoCaixaService({
			dadosFechamentoCaixa,
			idusuario,
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
			error: "Erro ao criar fechamento de caixa",
			code: "CREATE_FECHAMENTO_CAIXA_ERROR",
		});
	}
}
