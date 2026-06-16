import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarMovimentoEstoqueService } from "@/service/movimento-estoque/atualizar-movimento-estoque.js";

const atualizarMovimentoEstoqueParamsSchema = z.object({
	id: z.coerce.number().int().positive(),
});

const atualizarMovimentoEstoqueBodySchema = z.object({
	idempresa: z.string().uuid().optional(),
	cancelado: z.number().int().optional().nullable(),
	currenttimemillis: z.number().int().optional().nullable(),
	custoaquisicao: z.string().optional().nullable(),
	customedio: z.string().optional().nullable(),
	custototal: z.string().optional().nullable(),
	data: z.string().optional().nullable(),
	datahora: z.string().optional().nullable(),
	iditemoriginal: z.string().optional().nullable(),
	idlocalestoque: z.string().uuid().optional().nullable(),
	idlote: z.string().optional().nullable(),
	idoriginal: z.string().optional().nullable(),
	idproduto: z.string().uuid().optional().nullable(),
	observacao: z.string().max(50).optional().nullable(),
	pontoequilibrio: z.string().optional().nullable(),
	precocusto: z.string().optional().nullable(),
	precoultimacompra: z.string().optional().nullable(),
	quantidadeentrada: z.string().optional().nullable(),
	quantidadesaida: z.string().optional().nullable(),
	tipodocumento: z.number().int().optional().nullable(),
	valortotal: z.string().optional().nullable(),
	variacao: z.number().int().optional().nullable(),
});

export async function atualizarMovimentoEstoque(
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
		const { id } = atualizarMovimentoEstoqueParamsSchema.parse(
			request.params,
		);
		const dados = atualizarMovimentoEstoqueBodySchema.parse(request.body);

		const resultado = await atualizarMovimentoEstoqueService({
			movimentoEstoqueId: id,
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
			error: "Erro ao atualizar movimento de estoque",
			code: "UPDATE_MOVIMENTO_ESTOQUE_ERROR",
		});
	}
}

