import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { DuplicataImportacaoNf } from "@/model/nota-fiscal-importacao-model.js";
import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import { criarFinanceiro } from "@/repositories/financeiro-repositories.js";
import { montarIdentificacaoFinanceiroNf } from "@/util/financeiro-nf-util.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { TIPO_ORIGEM_FINANCEIRO_NF_COMPRA } from "@/util/nota-fiscal-constants.js";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";

type GerarContasPagarNfParametros = {
	idempresa: string;
	idnotafiscal: string;
	identidade?: string | undefined;
	idcondicaopagto?: string | undefined;
	duplicatas?: DuplicataImportacaoNf[] | undefined;
	idtipodocumento?: string | undefined;
	idplanocontas?: string | undefined;
	valortotalnota: string;
	emissao: string;
	numero?: string | undefined;
	serie?: string | undefined;
	chavenfe?: string | undefined;
	razaosocial?: string | undefined;
};

type GerarContasPagarNfResposta = {
	totalParcelas: number;
	parcelasGeradas: number;
};

function calcularVencimento(dataBase: string, dias: number): string {
	const data = new Date(dataBase);
	data.setDate(data.getDate() + dias);
	return data.toISOString().substring(0, 10);
}

function distribuirValor(total: number, parcelas: number): number[] {
	const valorParcela = Math.floor((total * 100) / parcelas) / 100;
	const soma = valorParcela * (parcelas - 1);
	const ultimaParcela = Math.round((total - soma) * 100) / 100;

	const resultado = Array(parcelas - 1).fill(valorParcela);
	resultado.push(ultimaParcela);

	return resultado;
}

function normalizarDataVencimento(vencimento?: string): string | null {
	if (!vencimento?.trim()) return null;
	const texto = vencimento.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
		return texto.substring(0, 10);
	}
	return texto;
}

async function gerarParcelasPorDuplicatas(
	parametros: GerarContasPagarNfParametros,
	duplicatas: DuplicataImportacaoNf[],
	nomeFornecedor?: string,
	cnpjFornecedor?: string | null,
): Promise<number> {
	const dataRegistro = new Date().toISOString();
	const dataEmissao = parametros.emissao.substring(0, 10);
	const totalParcelas = duplicatas.length;
	let parcelasGeradas = 0;

	for (let i = 0; i < duplicatas.length; i++) {
		const dup = duplicatas[i];
		if (!dup) continue;

		const parcelaAtual = i + 1;
		const valorParcela = parseFloat(dup.valor ?? "0");
		if (Number.isNaN(valorParcela) || valorParcela <= 0) continue;

		const vencimento =
			normalizarDataVencimento(dup.vencimento) ??
			calcularVencimento(dataEmissao, parcelaAtual * 30);

		const identificacao = montarIdentificacaoFinanceiroNf({
			numero: parametros.numero,
			serie: parametros.serie,
			parcela: parcelaAtual,
			totalParcelas,
			nomeFornecedor,
		});

		const financeiro = await criarFinanceiro({
			id: uuidv4(),
			idempresa: parametros.idempresa,
			identidade: parametros.identidade ?? null,
			tipo: "P",
			tipoorigem: TIPO_ORIGEM_FINANCEIRO_NF_COMPRA,
			idorigem: parametros.idnotafiscal,
			parcela: parcelaAtual,
			totalparcelas: totalParcelas,
			documento: dup.numero?.trim() || identificacao.documento,
			emitente: identificacao.emitente,
			cnpjcpfemitente: cnpjFornecedor ?? null,
			idtipodocumentofinanceiro: parametros.idtipodocumento ?? null,
			idplanocontas: parametros.idplanocontas ?? null,
			status: "A",
			emissao: dataEmissao,
			vencimento,
			vencimentooriginal: vencimento,
			valor: valorParcela.toFixed(2),
			saldo: valorParcela.toFixed(2),
			historico: identificacao.historico,
			extra1: parametros.chavenfe?.trim() || null,
			registro: dataRegistro,
			currenttimemillis: Date.now(),
		});

		if (financeiro) {
			parcelasGeradas++;
		}
	}

	return parcelasGeradas;
}

export async function gerarContasPagarNfService({
	idempresa,
	idnotafiscal,
	identidade,
	idcondicaopagto,
	duplicatas,
	idtipodocumento,
	idplanocontas,
	valortotalnota,
	emissao,
	numero,
	serie,
	chavenfe,
	razaosocial,
}: GerarContasPagarNfParametros): Promise<
	HttpResponse<GerarContasPagarNfResposta>
> {
	const fornecedor = identidade
		? await buscarEntidadePorId(identidade)
		: undefined;
	const nomeFornecedor =
		fornecedor?.razaosocial?.trim() ||
		fornecedor?.nome?.trim() ||
		razaosocial?.trim() ||
		undefined;

	const duplicatasValidas =
		duplicatas?.filter(
			(dup) => dup.valor && parseFloat(dup.valor) > 0,
		) ?? [];

	if (duplicatasValidas.length > 0) {
		const parcelasGeradas = await gerarParcelasPorDuplicatas(
			{
				idempresa,
				idnotafiscal,
				identidade,
				idtipodocumento,
				idplanocontas,
				valortotalnota,
				emissao,
				numero,
				serie,
				chavenfe,
				razaosocial,
			},
			duplicatasValidas,
			nomeFornecedor,
			fornecedor?.cnpjcpf ?? null,
		);

		return httpOk<GerarContasPagarNfResposta>({
			totalParcelas: duplicatasValidas.length,
			parcelasGeradas,
		});
	}

	if (!idcondicaopagto) {
		return httpBadRequest(
			"Informe a condição de pagamento ou importe duplicatas do XML",
		);
	}

	const condicao = await buscarCondicaoPagamentoPorId(idcondicaopagto);

	if (!condicao) {
		return httpBadRequest("Condição de pagamento não encontrada");
	}

	const { totalParcelas: parcelasResolvidas, prazosDias: prazosFinal } =
		resolverParcelasCondicaoPagamento(condicao);

	const valorTotal = parseFloat(valortotalnota);
	const valores = distribuirValor(valorTotal, parcelasResolvidas);
	const dataAtual = emissao.substring(0, 10);
	const dataRegistro = new Date().toISOString();

	let parcelasGeradas = 0;

	for (let i = 0; i < parcelasResolvidas; i++) {
		const parcelaAtual = i + 1;
		const vencimento = calcularVencimento(dataAtual, prazosFinal[i] ?? 0);
		const valorParcela = valores[i] ?? 0;

		const identificacao = montarIdentificacaoFinanceiroNf({
			numero,
			serie,
			parcela: parcelaAtual,
			totalParcelas: parcelasResolvidas,
			nomeFornecedor,
		});

		const financeiro = await criarFinanceiro({
			id: uuidv4(),
			idempresa,
			identidade: identidade ?? null,
			tipo: "P",
			tipoorigem: TIPO_ORIGEM_FINANCEIRO_NF_COMPRA,
			idorigem: idnotafiscal,
			parcela: parcelaAtual,
			totalparcelas: parcelasResolvidas,
			documento: identificacao.documento,
			emitente: identificacao.emitente,
			cnpjcpfemitente: fornecedor?.cnpjcpf ?? null,
			idtipodocumentofinanceiro: idtipodocumento ?? null,
			idplanocontas: idplanocontas ?? null,
			status: "A",
			emissao: dataAtual,
			vencimento,
			vencimentooriginal: vencimento,
			valor: valorParcela.toFixed(2),
			saldo: valorParcela.toFixed(2),
			historico: identificacao.historico,
			extra1: chavenfe?.trim() || null,
			registro: dataRegistro,
			currenttimemillis: Date.now(),
		});

		if (financeiro) {
			parcelasGeradas++;
		}
	}

	return httpOk<GerarContasPagarNfResposta>({
		totalParcelas: parcelasResolvidas,
		parcelasGeradas,
	});
}
