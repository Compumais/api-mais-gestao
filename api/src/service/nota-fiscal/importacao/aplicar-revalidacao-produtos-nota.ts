import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarNotaCompraConfirmada,
	listarItensCompraConfirmadaAuditoria,
	listarMovimentosPorNotas,
} from "@/repositories/auditoria-entrada-nf-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { garantirLocalEstoqueEmpresa } from "@/repositories/local-estoque-repositories.js";
import { atualizarProduto } from "@/repositories/produtos-repositories.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";
import {
	completarCodigoBarrasDosItens,
	decidirLancamentoEstoqueRevalidacao,
	interpretarQuantidadeEntrada,
	montarPatchCadastroRevalidacao,
	resolverCustoUnitarioEntradaNota,
	type ItemAuditoriaEntrada,
} from "./auditar-entrada-nf-confirmada.js";
import { resolverCfopSaidaDeEntrada } from "./resolver-referencias-importacao.js";

export type ResultadoEstoqueRevalidacao = "lancado" | "ja_inserido" | "nao_corrigido";

export type ItemAplicacaoRevalidacao = {
	iditem: string;
	contador: number | null;
	descricao: string;
	idproduto: string;
	nomeProduto: string | null;
	cadastro: "atualizado" | "ja_ok";
	camposAtualizados: string[];
	estoque: ResultadoEstoqueRevalidacao;
	motivoEstoque: string;
	quantidadeEsperada: number | null;
	quantidadeMovimento: number | null;
};

export type AplicacaoRevalidacaoProdutosNota = {
	somenteLeitura: false;
	idnotafiscal: string;
	numero: string | null;
	chavenfe: string | null;
	aviso: string;
	resumo: {
		itensComProduto: number;
		cadastrosAtualizados: number;
		cadastrosJaOk: number;
		estoquesLancados: number;
		estoquesJaInseridos: number;
		estoquesNaoCorrigidos: number;
	};
	itens: ItemAplicacaoRevalidacao[];
	avisos: string[];
};

function custoUnitarioItem(item: ItemAuditoriaEntrada): string {
	return resolverCustoUnitarioEntradaNota(item) ?? "0";
}

function dataMovimentoNota(entradasaida: string | null | undefined): string {
	if (entradasaida && entradasaida.length >= 10) return entradasaida.slice(0, 10);
	return new Date().toISOString().slice(0, 10);
}

export async function aplicarRevalidacaoProdutosNotaService(params: {
	idusuario: string;
	idempresa: string;
	idnotafiscal: string;
}): Promise<HttpResponse<AplicacaoRevalidacaoProdutosNota>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	const nota = await buscarNotaCompraConfirmada(
		params.idempresa,
		params.idnotafiscal,
	);
	if (!nota) {
		return httpNaoEncontrado("Nota de compra confirmada não encontrada");
	}

	const linhas = completarCodigoBarrasDosItens(
		await listarItensCompraConfirmadaAuditoria({
			idempresa: params.idempresa,
			idnotafiscal: params.idnotafiscal,
			limit: 500,
		}),
		nota.arquivoxmlnotaoriginal,
	);
	const movimentos = await listarMovimentosPorNotas([params.idnotafiscal]);
	const daNota = movimentos.filter(
		(movimento) => movimento.idoriginal === params.idnotafiscal,
	);

	const localGarantido = nota.idlocalestoque
		? { id: nota.idlocalestoque, criado: false }
		: await garantirLocalEstoqueEmpresa(params.idempresa).then((resolvido) =>
				resolvido
					? { id: resolvido.local.id, criado: resolvido.criado }
					: undefined,
			);

	const planejados: Array<{
		item: ItemAuditoriaEntrada;
		quantidade: string;
		custoUnitario: string;
	}> = [];
	const itens: ItemAplicacaoRevalidacao[] = [];

	for (const linha of linhas) {
		if (!linha.idproduto) continue;
		const item: ItemAuditoriaEntrada = {
			...linha,
			idproduto: linha.idproduto,
		};

		let idcfopsaidaSugerido: string | undefined;
		if (!item.idcfopsaidaProduto || !item.idcfopsaidanfceProduto) {
			const cfopSaida = await resolverCfopSaidaDeEntrada(
				params.idempresa,
				item.idcfopItem ?? undefined,
			);
			idcfopsaidaSugerido = cfopSaida?.id;
		}

		const { patch, campos } = montarPatchCadastroRevalidacao(item, {
			idcfopsaidaSugerido,
		});
		delete patch.quantidadepadrao;

		if (Object.keys(patch).length > 0) {
			await atualizarProduto(item.idproduto, patch);
		}

		const quantidade = interpretarQuantidadeEntrada(item, daNota);
		const decisao = decidirLancamentoEstoqueRevalidacao(quantidade);
		if (decisao.lancar && quantidade.quantidadeEsperada != null) {
			planejados.push({
				item,
				quantidade: quantidade.quantidadeEsperada.toFixed(6),
				custoUnitario: custoUnitarioItem(item),
			});
		}

		itens.push({
			iditem: item.iditem,
			contador: item.contador ?? null,
			descricao: item.descricao?.trim() || "Item sem descrição",
			idproduto: item.idproduto,
			nomeProduto: item.nomeProduto ?? null,
			cadastro: campos.length > 0 ? "atualizado" : "ja_ok",
			camposAtualizados: campos,
			estoque: decisao.resultado,
			motivoEstoque: decisao.motivo,
			quantidadeEsperada: quantidade.quantidadeEsperada,
			quantidadeMovimento: quantidade.quantidadeMovimento,
		});
	}

	const avisos: string[] = [];
	if (localGarantido?.criado) {
		avisos.push(
			"A empresa não tinha local de estoque. Foi criado o local padrão Estoque para registrar a entrada.",
		);
	}
	if (planejados.length > 0) {
		const resultadoEstoque = await registrarMovimentosEstoqueNf({
			idempresa: params.idempresa,
			idnotafiscal: params.idnotafiscal,
			idlocalestoque: localGarantido?.id,
			dataMovimento: dataMovimentoNota(nota.entradasaida),
			sentido: "entrada",
			idusuario: params.idusuario,
			itens: planejados.map((planejado) => ({
				iditem: planejado.item.iditem,
				idproduto: planejado.item.idproduto,
				quantidade: planejado.quantidade,
				custoUnitario: planejado.custoUnitario,
			})),
		});
		avisos.push(...resultadoEstoque.avisos);

		const lancouTudo =
			resultadoEstoque.movimentosCriados === planejados.length &&
			resultadoEstoque.avisos.length === 0;
		if (!lancouTudo) {
			const motivo =
				resultadoEstoque.avisos.join(" ") ||
				"A entrada de estoque não foi gravada.";
			for (const item of itens) {
				if (item.estoque !== "lancado") continue;
				item.estoque = "nao_corrigido";
				item.motivoEstoque = motivo;
			}
		}
	}

	const resumo = {
		itensComProduto: itens.length,
		cadastrosAtualizados: 0,
		cadastrosJaOk: 0,
		estoquesLancados: 0,
		estoquesJaInseridos: 0,
		estoquesNaoCorrigidos: 0,
	};
	for (const item of itens) {
		if (item.cadastro === "atualizado") resumo.cadastrosAtualizados += 1;
		else resumo.cadastrosJaOk += 1;
		if (item.estoque === "lancado") resumo.estoquesLancados += 1;
		if (item.estoque === "ja_inserido") resumo.estoquesJaInseridos += 1;
		if (item.estoque === "nao_corrigido") resumo.estoquesNaoCorrigidos += 1;
	}

	return httpOk({
		somenteLeitura: false,
		idnotafiscal: nota.id,
		numero: nota.numero ?? nota.numeronotafiscal,
		chavenfe: nota.chavenfe,
		aviso:
			"Cadastro de entrada atualizado nesta nota. Estoque novo só entra quando o item não tinha movimento. Quantidade divergente ou movimento sem vínculo do item fica de fora para não dobrar o saldo.",
		resumo,
		itens,
		avisos,
	});
}
