import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import { db } from "@/repositories/connection.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "@/repositories/conta-corrente-repositories.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceirosPorOrigem,
	criarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { inserirLancamentoCaixa } from "@/service/conta-corrente/inserir-lancamento-caixa.js";
import { montarIdentificacaoFinanceiroNf } from "@/util/financeiro-nf-util.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { TIPO_ORIGEM_FINANCEIRO_NF_VENDA } from "@/util/nota-fiscal-constants.js";
import {
	adicionarDias,
	formatarDataIso,
	formatarValorMonetario,
} from "@/util/recebimentos-venda-util.js";
import {
	resolverDestinoFinanceiroFormaPagamento,
	resolverPrazoDiasTipoDocumento,
} from "@/util/resolver-financeiro-emissao-nfe.js";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";

export type FormaPagamentoNfVenda = {
	idtipodocumentofinanceiro: string;
	valor: number;
	indPag?: number | undefined;
};

type GerarContasReceberNfParametros = {
	idempresa: string;
	idnotafiscal: string;
	idusuario: string;
	identidade?: string | undefined;
	idcondicaopagto?: string | undefined;
	idtipodocumento?: string | undefined;
	idplanocontas?: string | undefined;
	valortotalnota: string;
	emissao: string;
	numero?: string | undefined;
	serie?: string | undefined;
	chavenfe?: string | undefined;
	razaosocial?: string | undefined;
	formasPagamento?: FormaPagamentoNfVenda[] | undefined;
};

type GerarContasReceberNfResposta = {
	totalParcelas: number;
	parcelasGeradas: number;
	lancamentosCaixa: number;
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

async function resolverCaixaPadrao(idempresa: string) {
	let caixa = await buscarContaCorrenteCaixaPadrao(idempresa);
	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(idempresa);
	}
	return caixa;
}

async function gerarParcelasPorCondicao(
	parametros: GerarContasReceberNfParametros,
	valorTotal: number,
	nomeCliente?: string,
	cnpjCliente?: string | null,
	idplanocontasPadrao?: string | null,
	idtipodocumentoPadrao?: string | null,
): Promise<number> {
	const condicao = await buscarCondicaoPagamentoPorId(
		parametros.idcondicaopagto!,
	);

	if (!condicao) {
		return 0;
	}

	const { totalParcelas, prazosDias: prazosFinal } =
		resolverParcelasCondicaoPagamento(condicao);

	const valores = distribuirValor(valorTotal, totalParcelas);
	const dataAtual = parametros.emissao.substring(0, 10);
	const dataRegistro = new Date().toISOString();

	let parcelasGeradas = 0;

	for (let i = 0; i < totalParcelas; i++) {
		const parcelaAtual = i + 1;
		const vencimento = calcularVencimento(dataAtual, prazosFinal[i] ?? 0);
		const valorParcela = valores[i] ?? 0;

		const identificacao = montarIdentificacaoFinanceiroNf({
			numero: parametros.numero,
			serie: parametros.serie,
			parcela: parcelaAtual,
			totalParcelas,
			nomeCliente,
			tipo: "venda",
		});

		const financeiro = await criarFinanceiro({
			id: uuidv4(),
			idempresa: parametros.idempresa,
			identidade: parametros.identidade ?? null,
			tipo: "R",
			tipoorigem: TIPO_ORIGEM_FINANCEIRO_NF_VENDA,
			idorigem: parametros.idnotafiscal,
			parcela: parcelaAtual,
			totalparcelas: totalParcelas,
			documento: identificacao.documento,
			emitente: identificacao.emitente,
			cnpjcpfemitente: cnpjCliente ?? null,
			idtipodocumentofinanceiro: idtipodocumentoPadrao ?? null,
			idplanocontas: idplanocontasPadrao ?? null,
			status: "A",
			emissao: dataAtual,
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

export async function gerarContasReceberNfService(
	parametros: GerarContasReceberNfParametros,
): Promise<HttpResponse<GerarContasReceberNfResposta>> {
	const existentes = await buscarFinanceirosPorOrigem(
		parametros.idempresa,
		TIPO_ORIGEM_FINANCEIRO_NF_VENDA,
		parametros.idnotafiscal,
	);

	if (existentes.length > 0) {
		return httpOk<GerarContasReceberNfResposta>({
			totalParcelas: existentes.length,
			parcelasGeradas: 0,
			lancamentosCaixa: 0,
		});
	}

	const cliente = parametros.identidade
		? await buscarEntidadePorId(parametros.identidade)
		: undefined;
	const nomeCliente =
		cliente?.razaosocial?.trim() ||
		cliente?.nome?.trim() ||
		parametros.razaosocial?.trim() ||
		undefined;

	const valorTotal = parseFloat(parametros.valortotalnota);
	if (Number.isNaN(valorTotal) || valorTotal <= 0) {
		return httpOk({
			totalParcelas: 0,
			parcelasGeradas: 0,
			lancamentosCaixa: 0,
		});
	}

	const dataEmissao = parametros.emissao.substring(0, 10);
	const dataRegistro = new Date().toISOString();
	let parcelasGeradas = 0;
	let lancamentosCaixa = 0;

	const formas = parametros.formasPagamento?.filter((f) => f.valor > 0) ?? [];

	if (parametros.idcondicaopagto) {
		const condicao = await buscarCondicaoPagamentoPorId(
			parametros.idcondicaopagto,
		);

		if (condicao && (condicao.parcelas ?? 1) > 1) {
			let idplanocontas = parametros.idplanocontas ?? null;
			if (parametros.idtipodocumento) {
				const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
					parametros.idtipodocumento,
				);
				if (tipoDoc?.idplanocontas) {
					idplanocontas = tipoDoc.idplanocontas;
				}
			}

			const geradas = await gerarParcelasPorCondicao(
				parametros,
				valorTotal,
				nomeCliente,
				cliente?.cnpjcpf ?? null,
				idplanocontas,
				parametros.idtipodocumento ?? null,
			);

			return httpOk({
				totalParcelas: geradas,
				parcelasGeradas: geradas,
				lancamentosCaixa: 0,
			});
		}
	}

	if (formas.length > 0) {
		const caixa = await resolverCaixaPadrao(parametros.idempresa);

		for (const forma of formas) {
			const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
				forma.idtipodocumentofinanceiro,
			);

			if (!tipoDoc) continue;

			const idplanocontas =
				tipoDoc.idplanocontas ?? parametros.idplanocontas ?? null;
			const destino = resolverDestinoFinanceiroFormaPagamento(
				tipoDoc,
				forma.indPag,
			);

			const identificacao = montarIdentificacaoFinanceiroNf({
				numero: parametros.numero,
				serie: parametros.serie,
				parcela: 1,
				totalParcelas: 1,
				nomeCliente,
				tipo: "venda",
			});

			if (destino === "caixa_imediato" && caixa && idplanocontas) {
				await db.transaction(async (tx) => {
					await inserirLancamentoCaixa(tx, {
						idcontacorrente: caixa.id,
						idusuario: parametros.idusuario,
						idplanocontas,
						valor: forma.valor,
						historico: identificacao.historico,
						documento: parametros.idnotafiscal,
						datahora: formatarDataIso(new Date()),
					});
				});
				lancamentosCaixa++;
				continue;
			}

			const prazoDias = resolverPrazoDiasTipoDocumento(tipoDoc);
			const vencimento =
				destino === "titulo_vista"
					? dataEmissao
					: adicionarDias(new Date(dataEmissao), prazoDias);

			const financeiro = await criarFinanceiro({
				id: uuidv4(),
				idempresa: parametros.idempresa,
				identidade: parametros.identidade ?? null,
				tipo: "R",
				tipoorigem: TIPO_ORIGEM_FINANCEIRO_NF_VENDA,
				idorigem: parametros.idnotafiscal,
				parcela: 1,
				totalparcelas: 1,
				documento: identificacao.documento,
				emitente: identificacao.emitente,
				cnpjcpfemitente: cliente?.cnpjcpf ?? null,
				idtipodocumentofinanceiro: tipoDoc.id,
				idplanocontas,
				status: "A",
				emissao: dataEmissao,
				vencimento,
				vencimentooriginal: vencimento,
				valor: formatarValorMonetario(forma.valor),
				saldo: formatarValorMonetario(forma.valor),
				historico: identificacao.historico,
				extra1: parametros.chavenfe?.trim() || null,
				registro: dataRegistro,
				currenttimemillis: Date.now(),
			});

			if (financeiro) {
				parcelasGeradas++;
			}
		}

		return httpOk({
			totalParcelas: parcelasGeradas + lancamentosCaixa,
			parcelasGeradas,
			lancamentosCaixa,
		});
	}

	if (parametros.idcondicaopagto) {
		let idplanocontas = parametros.idplanocontas ?? null;
		if (parametros.idtipodocumento) {
			const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
				parametros.idtipodocumento,
			);
			if (tipoDoc?.idplanocontas) {
				idplanocontas = tipoDoc.idplanocontas;
			}
		}

		const geradas = await gerarParcelasPorCondicao(
			parametros,
			valorTotal,
			nomeCliente,
			cliente?.cnpjcpf ?? null,
			idplanocontas,
			parametros.idtipodocumento ?? null,
		);

		return httpOk({
			totalParcelas: geradas,
			parcelasGeradas: geradas,
			lancamentosCaixa: 0,
		});
	}

	if (parametros.idtipodocumento) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			parametros.idtipodocumento,
		);

		if (!tipoDoc) {
			return httpBadRequest("Tipo de documento financeiro não encontrado");
		}

		const resultadoForma = await gerarContasReceberNfService({
			...parametros,
			formasPagamento: [
				{
					idtipodocumentofinanceiro: parametros.idtipodocumento,
					valor: valorTotal,
				},
			],
		});

		return resultadoForma;
	}

	return httpBadRequest(
		"Informe formas de pagamento, condição de pagamento ou tipo de documento financeiro",
	);
}
