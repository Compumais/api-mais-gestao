import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarSaldoEstoqueService } from "@/service/saldo-estoque/criar-saldo-estoque.js";

const criarSaldoEstoqueBodySchema = z.object({
	idempresa: z.string().uuid(),
	cest: z.string().max(10).optional().nullable(),
	cnpjfilial: z.string().max(18).optional().nullable(),
	codigoproduto: z.string().max(20).optional().nullable(),
	currenttimemillis: z.number().int().optional().nullable(),
	hash: z.number().int().optional().nullable(),
	idfilial: z.number().int().optional().nullable(),
	idproduto: z.number().int().optional().nullable(),
	ncm: z.string().max(10).optional().nullable(),
	nomeproduto: z.string().max(120).optional().nullable(),
	quantidade: z.string().optional().nullable(),
	ultimaalteracao: z.string().optional().nullable(),
	unidademedida: z.string().max(6).optional().nullable(),
	variacao: z.number().int().optional().nullable(),
});

export async function criarSaldoEstoque(
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
		const dadosValidados = criarSaldoEstoqueBodySchema.parse(request.body);

		const resultado = await criarSaldoEstoqueService({
			dadosSaldoEstoque: dadosValidados,
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
			error: "Erro ao criar saldo de estoque",
			code: "CREATE_SALDO_ESTOQUE_ERROR",
		});
	}
}
