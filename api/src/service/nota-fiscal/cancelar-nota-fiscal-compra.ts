import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarUltimoCustoProduto,
	excluirCustosProdutoPorNotaFiscal,
} from "@/repositories/custo-produto-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { excluirFinanceirosPorOrigem } from "@/repositories/financeiro-repositories.js";
import { excluirMovimentosEstoquePorIdOriginal } from "@/repositories/movimento-estoque-repositories.js";
import {
	buscarNotaFiscalPorId,
	excluirNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { atualizarProduto } from "@/repositories/produtos-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { estornarIntegracaoNotaFiscalCompraService } from "@/service/nota-fiscal/estornar-integracao-nota-fiscal-compra.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import {
	STATUS_NF_COMPRA_CANCELADA,
	STATUS_NF_CONFIRMADA,
	STATUS_RASCUNHO_IMPORTACAO,
	TIPO_ORIGEM_FINANCEIRO_NF_COMPRA,
} from "@/util/nota-fiscal-constants.js";

type CancelarNotaFiscalCompraParametros = {
	notaFiscalId: string;
	idusuario: string;
	idempresa: string;
	motivo?: string | undefined;
};

export type CancelarNotaFiscalCompraResposta = {
	titulosEstornados: number;
	movimentosEstornados: number;
	custosRemovidos: number;
	avisos: string[];
};

async function recalcularCustoProdutoAposRemocaoNota(idproduto: string) {
	const ultimo = await buscarUltimoCustoProduto(idproduto);

	await atualizarProduto(idproduto, {
		precoultimacompra: ultimo?.precocompra ?? null,
		custoaquisicao: ultimo?.custoaquisicao ?? ultimo?.custo ?? null,
		customedioinicial: ultimo?.customedio ?? null,
	});
}

export async function cancelarNotaFiscalCompraService({
	notaFiscalId,
	idusuario,
	idempresa,
	motivo,
}: CancelarNotaFiscalCompraParametros): Promise<
	HttpResponse<CancelarNotaFiscalCompraResposta>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalPorId(notaFiscalId);

	if (!nota || nota.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (nota.tipoorigem !== 0 && nota.tipoorigem !== null) {
		return httpBadRequest("Esta rota cancela apenas notas fiscais de compra");
	}

	if (nota.status === STATUS_RASCUNHO_IMPORTACAO) {
		return httpBadRequest(
			"Rascunho de importação deve ser excluído, não cancelado",
		);
	}

	if (nota.status === STATUS_NF_COMPRA_CANCELADA) {
		return httpBadRequest(
			"Nota fiscal de compra já está cancelada. Use a exclusão apenas para limpar resíduos antigos.",
		);
	}

	if (
		nota.status !== null &&
		nota.status !== undefined &&
		nota.status !== STATUS_NF_CONFIRMADA
	) {
		return httpBadRequest(
			"Somente notas de compra confirmadas podem ser canceladas",
		);
	}

	const estorno = await estornarIntegracaoNotaFiscalCompraService({
		idusuario,
		idnotafiscal: notaFiscalId,
		bloquearBaixaParcial: true,
	});

	if (!estorno.success) {
		return {
			success: false,
			status: estorno.status,
			error: estorno.error,
		} as HttpResponse<CancelarNotaFiscalCompraResposta>;
	}

	const avisos = [...(estorno.body?.avisos ?? [])];
	const movimentosEstornados = estorno.body?.movimentosEstornados ?? 0;

	const titulosEstornados = await excluirFinanceirosPorOrigem(
		idempresa,
		TIPO_ORIGEM_FINANCEIRO_NF_COMPRA,
		notaFiscalId,
	);

	const custos = await excluirCustosProdutoPorNotaFiscal(notaFiscalId);

	for (const idproduto of custos.idprodutos) {
		try {
			await recalcularCustoProdutoAposRemocaoNota(idproduto);
		} catch (erro) {
			console.error("Erro ao recalcular custo do produto após cancelar NF:", erro);
			avisos.push(
				`Não foi possível recalcular o custo do produto ${idproduto} após remover a nota`,
			);
		}
	}

	const movimentosRemovidosOriginais =
		await excluirMovimentosEstoquePorIdOriginal(notaFiscalId);
	const movimentosRemovidosEstorno =
		await excluirMovimentosEstoquePorIdOriginal(`${notaFiscalId}-estorno`);

	await excluirNotaFiscal(notaFiscalId);

	const agora = new Date().toISOString();

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "cancelar_nota_fiscal_compra",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: notaFiscalId,
			idempresa,
			criadoem: agora,
			metadados: {
				motivo: motivo?.trim()
					? motivo.trim().slice(0, 255)
					: "Cancelamento interno da nota de compra",
				titulosEstornados,
				movimentosEstornados,
				movimentosRemovidos:
					movimentosRemovidosOriginais + movimentosRemovidosEstorno,
				custosRemovidos: custos.quantidade,
				excluida: true,
			},
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria de cancelamento NF compra:", erro);
	}

	return httpOk({
		titulosEstornados,
		movimentosEstornados,
		custosRemovidos: custos.quantidade,
		avisos,
	});
}
