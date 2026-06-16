import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { buscarFinanceiroPorId } from "@/repositories/financeiro-repositories.js";
import { criarNotificacaoService } from "@/service/notificacoes/criar-notificacao.js";
import { criarFinanceiroLancamentoService } from "@/service/financeirolancamento/criar-financeiro-lancamento.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

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

		const dadosFinanceiroLancamento = {
			id: uuidv4(),
			idfinanceiro: dadosValidados.idfinanceiro,
			valoranterior: dadosValidados.valoranterior,
			desconto: dadosValidados.desconto,
			valor: dadosValidados.valor,
			pagamento: dadosValidados.pagamento,
			baixa: dadosValidados.baixa,
			juros: dadosValidados.juros,
			multa: dadosValidados.multa,
			usuario: dadosValidados.usuario,
			cancelado: dadosValidados.cancelado,
			datahoracancelado: dadosValidados.datahoracancelado,
			evento: dadosValidados.evento,
			historico: dadosValidados.historico,
			reabertura: dadosValidados.reabertura,
			observacao: dadosValidados.observacao,
		};

		const resultado = await criarFinanceiroLancamentoService({
			dadosFinanceiroLancamento,
			idusuario: request.user.id,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		const financeiro = await buscarFinanceiroPorId(dadosValidados.idfinanceiro);
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
