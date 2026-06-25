import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { atualizarDav, buscarDavPorNotaFiscal } from "@/repositories/dav-repositories.js";
import {
	atualizarFinanceiro,
	buscarFinanceirosPorOrigem,
} from "@/repositories/financeiro-repositories.js";
import {
	atualizarMovimentoEstoque,
	listarMovimentosEstoquePorDocumento,
} from "@/repositories/movimento-estoque-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria.js";
import { registrarMovimentosEstoqueNf } from "@/service/nota-fiscal/registrar-movimentos-estoque-nf.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { TIPO_ORIGEM_FINANCEIRO_NF_VENDA } from "@/util/nota-fiscal-constants.js";

export type EstornarIntegracaoNotaFiscalVendaParametros = {
	idusuario: string;
	idnotafiscal: string;
};

export type ResultadoEstornoIntegracaoNfVenda = {
	titulosCancelados: number;
	movimentosEstornados: number;
	avisos: string[];
};

export async function estornarIntegracaoNotaFiscalVendaService({
	idusuario,
	idnotafiscal,
}: EstornarIntegracaoNotaFiscalVendaParametros): Promise<
	HttpResponse<ResultadoEstornoIntegracaoNfVenda>
> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpBadRequest("Nota fiscal não encontrada");
	}

	const avisos: string[] = [];
	let titulosCancelados = 0;
	let movimentosEstornados = 0;
	const agora = new Date().toISOString();

	const titulos = await buscarFinanceirosPorOrigem(
		nota.idempresa,
		TIPO_ORIGEM_FINANCEIRO_NF_VENDA,
		idnotafiscal,
	);

	for (const titulo of titulos) {
		const saldo = parseFloat(titulo.saldo ?? "0");
		const valor = parseFloat(titulo.valor ?? "0");

		if (saldo < valor) {
			avisos.push(
				`Título ${titulo.documento ?? titulo.id} possui baixa parcial e não foi estornado automaticamente`,
			);
			continue;
		}

		await atualizarFinanceiro(titulo.id, { status: "C" });
		titulosCancelados++;
	}

	const movimentos = await listarMovimentosEstoquePorDocumento(idnotafiscal);

	for (const movimento of movimentos) {
		if (movimento.cancelado === 1) continue;

		const qtdSaida = parseFloat(movimento.quantidadesaida ?? "0");
		const sentidoEstorno = qtdSaida > 0 ? "entrada" : "saida";
		const quantidade = qtdSaida > 0 ? movimento.quantidadesaida : movimento.quantidadeentrada;

		if (!movimento.idproduto || !quantidade) continue;

		await atualizarMovimentoEstoque(movimento.id, { cancelado: 1 });

		if (movimento.idlocalestoque) {
			await registrarMovimentosEstoqueNf({
				idempresa: nota.idempresa,
				idnotafiscal: `${idnotafiscal}-estorno`,
				idlocalestoque: movimento.idlocalestoque,
				dataMovimento: agora,
				sentido: sentidoEstorno,
				itens: [
					{
						iditem: movimento.iditemoriginal ?? String(movimento.id),
						idproduto: movimento.idproduto,
						quantidade,
						custoUnitario: movimento.precocusto ?? "0",
					},
				],
			});
		}

		movimentosEstornados++;
	}

	const dav = await buscarDavPorNotaFiscal(idnotafiscal);
	if (dav) {
		await atualizarDav(dav.id, {
			idnotafiscal: null,
			datahorafaturamento: null,
			idusuariofaturamento: null,
		});
	}

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "estornar_integracao_nota_fiscal_venda",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: idnotafiscal,
			idempresa: nota.idempresa,
			criadoem: agora,
			metadados: { titulosCancelados, movimentosEstornados, avisos },
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria de estorno NF venda:", erro);
	}

	return httpOk({
		titulosCancelados,
		movimentosEstornados,
		avisos,
	});
}
