import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { db } from "@/repositories/connection.js";
import { buscarLancamentoContaPorDocumento } from "@/repositories/conta-corrente-lancamento-repositories.js";
import { buscarContaCorrenteCaixaPadrao } from "@/repositories/conta-corrente-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceirosPorOrigem,
} from "@/repositories/financeiro-repositories.js";
import {
	atualizarMovimentoEstoque,
	listarMovimentosEstoquePorIdOriginal,
} from "@/repositories/movimento-estoque-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import {
	atualizarVendaPdvGourmet,
	buscarVendaPdvGourmetPorId,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import { registrarMovimentoEstoque } from "@/service/estoque/registrar-movimento-estoque.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { statusEhAutorizada } from "@/util/nfe-status.js";
import {
	formatarDataIso,
	parseValorMonetario,
	TIPO_ORIGEM_VENDA_PDV,
} from "@/util/recebimentos-venda-util.js";
import {
	TIPO_DOCUMENTO_ESTOQUE,
	TIPO_ESTOQUE,
	type TipoEstoque,
} from "@/util/tipo-estoque.js";

export type ResultadoCancelamentoVendaNaoFiscal = {
	idvenda: string;
	titulosCancelados: number;
	movimentosEstornados: number;
	lancamentosCaixaEstornados: number;
	avisos: string[];
};

type CancelarVendaNaoFiscalPdvParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
	motivo?: string | null;
};

/**
 * Cancela venda PDV sem NFC-e autorizada: estorna estoque operacional, títulos
 * financeiros e lançamentos de caixa da origem venda PDV. Não chama SEFAZ.
 */
export async function cancelarVendaNaoFiscalPdvService({
	idusuario,
	idempresa,
	idvenda,
	motivo,
}: CancelarVendaNaoFiscalPdvParametros): Promise<
	HttpResponse<ResultadoCancelamentoVendaNaoFiscal>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const venda = await buscarVendaPdvGourmetPorId(idvenda);
	if (!venda || venda.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (venda.cancelada) {
		return httpBadRequest("Esta venda já está cancelada.");
	}

	if (venda.idnotafiscalnfce) {
		const nota = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
		if (nota && statusEhAutorizada(nota.status)) {
			return httpBadRequest(
				"Esta venda possui NFC-e autorizada. Use o cancelamento de NFC-e (SEFAZ).",
			);
		}
	}

	const avisos: string[] = [];
	let titulosCancelados = 0;
	let movimentosEstornados = 0;
	let lancamentosCaixaEstornados = 0;
	const agora = new Date().toISOString();
	const motivoTrim = motivo?.trim() || null;

	const titulos = await buscarFinanceirosPorOrigem(
		idempresa,
		TIPO_ORIGEM_VENDA_PDV,
		idvenda,
	);

	for (const titulo of titulos) {
		if (titulo.status === "C") continue;

		const saldo = Number.parseFloat(titulo.saldo ?? "0");
		const valor = Number.parseFloat(titulo.valor ?? "0");

		if (saldo < valor) {
			avisos.push(
				`Título ${titulo.documento ?? titulo.id} possui baixa parcial e não foi estornado automaticamente`,
			);
			continue;
		}

		await atualizarFinanceiro(titulo.id, { status: "C" });
		titulosCancelados++;
	}

	const movimentos = await listarMovimentosEstoquePorIdOriginal(idvenda);

	for (const movimento of movimentos) {
		if (movimento.cancelado === 1) continue;

		const qtdSaida = Number.parseFloat(movimento.quantidadesaida ?? "0");
		const qtdEntrada = Number.parseFloat(movimento.quantidadeentrada ?? "0");
		const sentidoEstorno = qtdSaida > 0 ? "entrada" : "saida";
		const quantidade = qtdSaida > 0 ? qtdSaida : qtdEntrada;

		if (!movimento.idproduto || !(quantidade > 0)) {
			await atualizarMovimentoEstoque(movimento.id, { cancelado: 1 });
			continue;
		}

		await atualizarMovimentoEstoque(movimento.id, { cancelado: 1 });

		const tipoestoque: TipoEstoque =
			movimento.tipoestoque != null
				? (movimento.tipoestoque as TipoEstoque)
				: TIPO_ESTOQUE.OPERACIONAL;

		await registrarMovimentoEstoque({
			idempresa,
			idproduto: movimento.idproduto,
			quantidade: quantidade.toFixed(6),
			sentido: sentidoEstorno,
			tipoestoque,
			tipodocumento: TIPO_DOCUMENTO_ESTOQUE.PDV,
			idoriginal: idvenda,
			iditemoriginal: movimento.idproduto,
			observacao: "Estorno cancelamento venda PDV não fiscal",
			permitirSemLote: true,
		});

		movimentosEstornados++;
	}

	try {
		const caixa = await buscarContaCorrenteCaixaPadrao(idempresa);
		const documentoOrigem = `PDV ${venda.numeropdv} ${venda.id}`.slice(0, 60);
		const documentoEstorno = `ESTORNO ${documentoOrigem}`.slice(0, 60);

		if (caixa) {
			const lancamento = await buscarLancamentoContaPorDocumento(
				caixa.id,
				documentoOrigem,
			);
			const jaEstornado = await buscarLancamentoContaPorDocumento(
				caixa.id,
				documentoEstorno,
			);
			const valorOrigem = parseValorMonetario(lancamento?.valor);
			const idPlano = lancamento?.idplanocontas
				? String(lancamento.idplanocontas)
				: "";

			if (lancamento && !jaEstornado && valorOrigem > 0 && idPlano) {
				await db.transaction(async (tx) => {
					await inserirLancamentoCaixa(tx, {
						idcontacorrente: caixa.id,
						idusuario,
						idplanocontas: idPlano,
						valor: valorOrigem,
						historico: `Estorno cancelamento venda PDV #${venda.numeropdv}`,
						documento: documentoEstorno,
						datahora: formatarDataIso(new Date()),
						tipo: "D",
					});
				});
				lancamentosCaixaEstornados++;
			}
		}
	} catch (erro) {
		console.error(
			"[pdv] Falha ao estornar lançamento de caixa da venda:",
			erro,
		);
		avisos.push(
			"Falha ao estornar lançamento de caixa; confira o caixa manualmente",
		);
	}

	await atualizarVendaPdvGourmet(idvenda, {
		cancelada: true,
		canceladaem: agora,
		motivocancelamento: motivoTrim,
		dataalteracao: agora,
	});

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "cancelar_venda_nao_fiscal_pdv",
			idusuario,
			recurso: "venda_pdv_gourmet",
			idrecurso: idvenda,
			idempresa,
			criadoem: agora,
			metadados: {
				motivo: motivoTrim,
				titulosCancelados,
				movimentosEstornados,
				lancamentosCaixaEstornados,
				avisos,
			},
		});
	} catch (erro) {
		console.error(
			"Erro ao registrar auditoria de cancelamento venda não fiscal:",
			erro,
		);
	}

	return httpOk({
		idvenda,
		titulosCancelados,
		movimentosEstornados,
		lancamentosCaixaEstornados,
		avisos,
	});
}
