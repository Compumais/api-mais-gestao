import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarLancamentoContaCorrentePorId } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrentePorId } from "@/repositories/conta-corrente-repositories.js";
import { excluirContaCorrenteLancamentoService } from "@/service/contacorrentelancamento/excluir-conta-corrente-lancamento.js";
import { httpNaoAutorizado, httpNaoEncontrado } from "@/util/http-util.js";

const excluirContaCorrenteLancamentoParamsSchema = z.object({
	id: z.string(),
});

export async function excluirContaCorrenteLancamento(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = excluirContaCorrenteLancamentoParamsSchema.parse(
			request.params,
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

		const resultado = await excluirContaCorrenteLancamentoService({
			id,
			idusuario,
			idempresa: contaCorrente.idempresa,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send();
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.message,
			});
		}
		return reply.status(500).send({
			error: "Erro ao excluir lançamento de conta corrente",
			code: "DELETE_CONTA_CORRENTE_LANCAMENTO_ERROR",
		});
	}
}
