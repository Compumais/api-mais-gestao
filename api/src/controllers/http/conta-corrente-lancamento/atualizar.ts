import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarLancamentoContaCorrentePorId } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { atualizarContaCorrenteLancamentoService } from "@/service/contacorrentelancamento/atualizar-conta-corrente-lancamento.js";
import { httpNaoAutorizado, httpNaoEncontrado } from "@/util/http-util.js";

const atualizarContaCorrenteLancamentoParamsSchema = z.object({
	id: z.string(),
});

const atualizarContaCorrenteLancamentoBodySchema = z.object({
	datahora: z.string().optional(),
	tipo: z.enum(["E", "S", "C", "D"]).optional(),
	valor: z.string().optional(),
	historico: z.string().optional(),
	idplanocontas: z.string().optional(),
	evento: z.number().optional(),
	debito: z.string().optional(),
	documento: z.string().max(60).optional(),
	dataconciliacao: z.string().optional(),
});

export async function atualizarContaCorrenteLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = atualizarContaCorrenteLancamentoParamsSchema.parse(
			request.params,
		);
		const dadosValidados = atualizarContaCorrenteLancamentoBodySchema.parse(
			request.body,
		);

		// Buscar lançamento para obter idcontacorrente
		const lancamento = await buscarLancamentoContaCorrentePorId({ id });

		if (!lancamento) {
			return reply.status(httpNaoEncontrado().status).send(httpNaoEncontrado());
		}

		// Buscar conta corrente para obter idempresa
		const contaCorrente = await buscarContaCorrentePorId({
			id: lancamento.idcontacorrente,
		});

		if (!contaCorrente || !contaCorrente.idempresa) {
			return reply.status(httpNaoEncontrado().status).send({
				error: "Conta corrente não encontrada",
				code: "CONTA_CORRENTE_NOT_FOUND",
			});
		}

		// Mapear tipo se fornecido
		const tipoLancamento = dadosValidados.tipo
			? dadosValidados.tipo === "E"
				? "C"
				: dadosValidados.tipo === "S"
					? "D"
					: dadosValidados.tipo
			: undefined;

		const dados = {
			...(dadosValidados.datahora && { datahora: dadosValidados.datahora }),
			...(tipoLancamento && { tipo: tipoLancamento }),
			...(dadosValidados.valor && { valor: dadosValidados.valor }),
			...(dadosValidados.historico !== undefined && {
				historico: dadosValidados.historico || null,
			}),
			...(dadosValidados.idplanocontas !== undefined && {
				idplanocontas: dadosValidados.idplanocontas || null,
			}),
			...(dadosValidados.evento !== undefined && {
				evento: dadosValidados.evento || null,
			}),
			...(dadosValidados.debito !== undefined && {
				debito: dadosValidados.debito || null,
			}),
			...(dadosValidados.documento !== undefined && {
				documento: dadosValidados.documento || null,
			}),
			...(dadosValidados.dataconciliacao !== undefined && {
				dataconciliacao: dadosValidados.dataconciliacao || null,
			}),
		};

		const resultado = await atualizarContaCorrenteLancamentoService({
			id,
			idusuario,
			idempresa: contaCorrente.idempresa,
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
			error: "Erro ao atualizar lançamento de conta corrente",
			code: "UPDATE_CONTA_CORRENTE_LANCAMENTO_ERROR",
		});
	}
}
