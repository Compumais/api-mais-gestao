import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import type { NovoFinanceiroLancamento } from "@/model/financeiro-lancamentos-model.js";
import { buscarFinanceiroLancamentoPorId } from "@/repositories/financeiro-lancamento-repositories.js";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { atualizarFinanceiroLancamentoService } from "@/service/financeirolancamento/atualizar-financeiro-lancamento.js";
import { httpNaoAutorizado, httpNaoEncontrado } from "@/util/http-util.js";

const atualizarFinanceiroLancamentoParamsSchema = z.object({
	id: z.string(),
});

const atualizarFinanceiroLancamentoBodySchema = z.object({
	idfinanceiro: z.string().optional(),
	valoranterior: z.string().optional(),
	desconto: z.string().optional(),
	valor: z.string().optional(),
	pagamento: z.string().optional(),
	baixa: z.string().optional(),
	juros: z.string().optional(),
	multa: z.string().optional(),
	usuario: z.string().max(10).optional(),
	cancelado: z.number().optional(),
	datahoracancelado: z.string().optional(),
	evento: z.number().optional(),
	historico: z.string().optional(),
	reabertura: z.string().optional(),
	observacao: z.string().optional(),
});

export async function atualizarFinanceiroLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = atualizarFinanceiroLancamentoParamsSchema.parse(
			request.params,
		);
		const body = atualizarFinanceiroLancamentoBodySchema.parse(request.body);

		// Incluir apenas propriedades definidas (compatível com exactOptionalPropertyTypes)
		const dados = Object.fromEntries(
			Object.entries(body).filter(
				(entry): entry is [string, string | number] => entry[1] !== undefined,
			),
		) as Partial<NovoFinanceiroLancamento>;

		// Buscar o lançamento para obter o idfinanceiro
		const lancamento = await buscarFinanceiroLancamentoPorId(id);

		if (!lancamento) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		// Buscar o financeiro para obter o idempresa
		const financeiro = await buscarFinanceiroPorId(lancamento.idfinanceiro);

		if (!financeiro?.idempresa) {
			return reply.status(httpNaoEncontrado().status).send({
				error: "Financeiro não encontrado",
				code: "FINANCEIRO_NOT_FOUND",
			});
		}

		const resultado = await atualizarFinanceiroLancamentoService({
			id,
			idusuario,
			idempresa: financeiro.idempresa,
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
			error: "Erro ao atualizar lançamento financeiro",
			code: "UPDATE_FINANCEIRO_LANCAMENTO_ERROR",
		});
	}
}
