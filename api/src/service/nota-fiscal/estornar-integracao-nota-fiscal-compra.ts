import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
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
import { TIPO_ORIGEM_FINANCEIRO_NF_COMPRA } from "@/util/nota-fiscal-constants.js";

export type EstornarIntegracaoNotaFiscalCompraParametros = {
	idusuario: string;
	idnotafiscal: string;
	/** Se true, falha quando houver título com baixa parcial */
	bloquearBaixaParcial?: boolean | undefined;
};

export type ResultadoEstornoIntegracaoNfCompra = {
	titulosCancelados: number;
	movimentosEstornados: number;
	avisos: string[];
};

export async function estornarIntegracaoNotaFiscalCompraService({
	idusuario,
	idnotafiscal,
	bloquearBaixaParcial = true,
}: EstornarIntegracaoNotaFiscalCompraParametros): Promise<
	HttpResponse<ResultadoEstornoIntegracaoNfCompra>
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
		TIPO_ORIGEM_FINANCEIRO_NF_COMPRA,
		idnotafiscal,
	);

	const titulosComBaixaParcial = titulos.filter((titulo) => {
		const saldo = parseFloat(titulo.saldo ?? "0");
		const valor = parseFloat(titulo.valor ?? "0");
		return saldo < valor && (titulo.status ?? "A") !== "C";
	});

	if (bloquearBaixaParcial && titulosComBaixaParcial.length > 0) {
		return httpBadRequest(
			"Não é possível estornar: existem títulos a pagar com baixa parcial. Estorne as baixas antes de cancelar a nota.",
		);
	}

	for (const titulo of titulos) {
		if ((titulo.status ?? "A") === "C") continue;

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

		const qtdEntrada = parseFloat(movimento.quantidadeentrada ?? "0");
		const qtdSaida = parseFloat(movimento.quantidadesaida ?? "0");
		const sentidoEstorno = qtdEntrada > 0 ? "saida" : "entrada";
		const quantidade =
			qtdEntrada > 0 ? movimento.quantidadeentrada : movimento.quantidadesaida;

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

	try {
		await criarAuditoriaService({
			id: uuidv4(),
			acao: "estornar_integracao_nota_fiscal_compra",
			idusuario,
			recurso: "nota_fiscal",
			idrecurso: idnotafiscal,
			idempresa: nota.idempresa,
			criadoem: agora,
			metadados: { titulosCancelados, movimentosEstornados, avisos },
		});
	} catch (erro) {
		console.error("Erro ao registrar auditoria de estorno NF compra:", erro);
	}

	return httpOk({
		titulosCancelados,
		movimentosEstornados,
		avisos,
	});
}
