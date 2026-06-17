import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarMovimentoEstoqueService } from "@/service/movimento-estoque/criar-movimento-estoque.js";

const criarMovimentoEstoqueBodySchema = z.object({
	idempresa: z.string().uuid(),
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

export async function criarMovimentoEstoque(
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
		const dadosValidados = criarMovimentoEstoqueBodySchema.parse(
			request.body,
		);

		const resultado = await criarMovimentoEstoqueService({
			dadosMovimentoEstoque: dadosValidados,
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

		const mensagemDb =
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "23503"
				? "Referência inválida ao criar movimento de estoque"
				: "Erro ao criar movimento de estoque";

		return reply.status(500).send({
			error: mensagemDb,
			code: "CREATE_MOVIMENTO_ESTOQUE_ERROR",
		});
	}
}

