import type { FechamentoCaixa } from "@/model/fechamento-caixa-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	type AtualizarFechamentoCaixaDados,
	buscarFechamentoCaixaPorId,
} from "@/repositories/fechamento-caixa-repositories.js";
import { db } from "@/repositories/connection.js";
import { fechamentopdv } from "@/repositories/schema.js";
import {
	consolidarRecebimentosFechamentoCaixa,
	STATUS_CAIXA_FECHADO,
} from "@/service/fechamento-caixa/consolidar-recebimentos-fechamento.js";
import { eq } from "drizzle-orm";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";

type AtualizarFechamentoCaixaParametros = {
	fechamentoCaixaId: number;
	idusuario: string;
	dados: AtualizarFechamentoCaixaDados;
};

export async function atualizarFechamentoCaixaService({
	fechamentoCaixaId,
	idusuario,
	dados,
}: AtualizarFechamentoCaixaParametros): Promise<
	HttpResponse<FechamentoCaixa | null>
> {
	const registroExistente = await buscarFechamentoCaixaPorId(fechamentoCaixaId);

	if (!registroExistente) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		registroExistente.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const estaFechando =
		dados.status === STATUS_CAIXA_FECHADO &&
		registroExistente.status !== STATUS_CAIXA_FECHADO;

	if (estaFechando) {
		try {
			const registroAtualizado = await db.transaction(async (tx) => {
				const [atualizado] = await tx
					.update(fechamentopdv)
					.set({
						...dados,
						datamodificacao: new Date(),
					})
					.where(eq(fechamentopdv.id, fechamentoCaixaId))
					.returning();

				if (!atualizado) {
					return null;
				}

				const consolidacao = await consolidarRecebimentosFechamentoCaixa({
					fechamento: atualizado,
					idusuario,
					tx,
				});

				if (!consolidacao.success) {
					throw new Error(consolidacao.mensagem);
				}

				return atualizado;
			});

			if (!registroAtualizado) {
				return httpNaoEncontrado();
			}

			return httpOk<FechamentoCaixa>(registroAtualizado);
		} catch (error) {
			console.error("Erro ao fechar caixa e consolidar recebimentos:", error);
			return httpBadRequest(
				error instanceof Error
					? error.message
					: "Falha ao consolidar recebimentos do fechamento de caixa",
			);
		}
	}

	const [registroAtualizado] = await db
		.update(fechamentopdv)
		.set({
			...dados,
			datamodificacao: new Date(),
		})
		.where(eq(fechamentopdv.id, fechamentoCaixaId))
		.returning();

	if (!registroAtualizado) {
		return httpNaoEncontrado();
	}

	return httpOk<FechamentoCaixa>(registroAtualizado);
}
