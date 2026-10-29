import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { aplicarApropriacaoBaixaFinanceiroCaixa } from "@/service/apropriacao-centro-custo/aplicar-apropriacao-origem.js";
import {
	criarFinanceiroLancamentoService,
	resolverHistoricoBaixaFinanceiro,
	resolverValorBaixaFinanceiro,
} from "@/service/financeirolancamento/criar-financeiro-lancamento.js";
import { criarNotificacaoService } from "@/service/notificacoes/criar-notificacao.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const pagamentoFinanceiroSchema = z.object({
	valor: z.union([z.string(), z.number()]).optional(),
	metodo: z.string().optional().nullable(),
	conta: z.string().optional().nullable(),
	observacao: z.string().optional().nullable(),
});

const criarFinanceiroLancamentoBodySchema = z.object({
	idfinanceiro: z.string(),
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
	evento: z.number(),
	historico: z.string().optional(),
	reabertura: z.string().optional(),
	observacao: z.string().optional(),
	pagamentos: z.array(pagamentoFinanceiroSchema).optional(),
});

export async function criarFinanceiroLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const dadosValidados = criarFinanceiroLancamentoBodySchema.parse(
			request.body,
		);

		const valorBaixaFinanceiro = resolverValorBaixaFinanceiro({
			valor: dadosValidados.valor,
			valorbaixa: undefined,
			pagamentos: dadosValidados.pagamentos,
		});
		const historicoFinal = resolverHistoricoBaixaFinanceiro({
			historico: dadosValidados.historico,
			pagamentos: dadosValidados.pagamentos,
		});

		const dadosFinanceiroLancamento = {
			id: uuidv4(),
			idfinanceiro: dadosValidados.idfinanceiro,
			valoranterior: dadosValidados.valoranterior,
			desconto: dadosValidados.desconto,
			valor: dadosValidados.valor ?? String(valorBaixaFinanceiro),
			valorbaixa: String(valorBaixaFinanceiro),
			pagamento: dadosValidados.pagamento,
			baixa: dadosValidados.baixa,
			juros: dadosValidados.juros,
			multa: dadosValidados.multa,
			usuario: dadosValidados.usuario,
			cancelado: dadosValidados.cancelado,
			datahoracancelado: dadosValidados.datahoracancelado,
			evento: dadosValidados.evento,
			historico: historicoFinal ?? dadosValidados.historico,
			reabertura: dadosValidados.reabertura,
			observacao: dadosValidados.observacao,
			pagamentos: dadosValidados.pagamentos,
		};

		const resultado = await criarFinanceiroLancamentoService({
			dadosFinanceiroLancamento,
			idusuario: request.user.id,
		});

		if (!resultado.success || !resultado.body) {
			return reply.status(resultado.status).send(resultado);
		}

		const financeiro = await buscarFinanceiroPorId(dadosValidados.idfinanceiro);
		if (financeiro?.idempresa && dadosValidados.valor) {
			await aplicarApropriacaoBaixaFinanceiroCaixa({
				idusuario: request.user.id,
				idempresa: financeiro.idempresa,
				idfinanceirolancamento: resultado.body.id,
				idfinanceiro: financeiro.id,
				valorBaixa: Math.abs(Number(dadosValidados.valor)),
			});
		}

		if (financeiro?.idempresa && request.user) {
			const perfilAutor = Array.isArray(request.user.roles)
				? request.user.roles
				: request.user.roles
					? [request.user.roles]
					: [];
			await criarNotificacaoService({
				tipo: "financeiro_lancamento",
				idempresa: financeiro.idempresa,
				idrecurso: resultado.body?.id ?? null,
				titulo: "Novo lançamento financeiro",
				detalhes: {
					valor: dadosValidados.valor,
					historico: dadosValidados.historico,
				},
				idusuarioAutor: request.user.id,
				perfilAutor,
			});
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (err) {
		console.error(err);

		if (err instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: err.issues,
			});
		}

		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}
