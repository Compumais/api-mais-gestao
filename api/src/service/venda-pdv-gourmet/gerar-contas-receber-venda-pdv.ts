import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import type { LancamentoPagamentoPdv } from "@/model/venda-pdv-pagamento-model.js";
import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceirosPorOrigem,
	criarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import {
	buscarTipoDocumentoFinanceiroPorId,
	listarTiposDocumentoFinanceiroAtivos,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { montarIdentificacaoFinanceiroPdv } from "@/util/financeiro-pdv-util.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import {
	adicionarDias,
	formatarValorMonetario,
	parseValorMonetario,
	TIPO_ORIGEM_VENDA_PDV,
} from "@/util/recebimentos-venda-util.js";
import { resolverPrazoDiasTipoDocumento } from "@/util/resolver-financeiro-emissao-nfe.js";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";
import {
	resolverTipoDocumentoPorFormaNfe,
	TPAG_CARTAO_CREDITO,
	TPAG_CARTAO_DEBITO,
	tipoDocumentoExigeClientePdv,
	tipoDocumentoGeraContasReceber,
} from "@/util/resolver-tipo-documento-pdv.js";

export type PagamentoErpVendaPdv = {
	idtipodocumentofinanceiro: string;
	valor: number;
};

type GerarContasReceberVendaPdvParametros = {
	venda: VendaPdvGourmet;
	idusuario: string;
	identidade?: string | undefined;
	idcondicaopagto?: string | undefined;
	pagamentosErp: PagamentoErpVendaPdv[];
};

type GerarContasReceberVendaPdvResposta = {
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

export async function inferirPagamentosErpVendaPdv(params: {
	venda: VendaPdvGourmet;
	pagamentos?: LancamentoPagamentoPdv[];
}): Promise<PagamentoErpVendaPdv[]> {
	const tipos = await listarTiposDocumentoFinanceiroAtivos(
		params.venda.idempresa,
	);
	if (tipos.length === 0) {
		return [];
	}

	let valorCredito = parseValorMonetario(params.venda.valorcartaocredito);
	const valorDebito = parseValorMonetario(params.venda.valorcartaodebito);
	if (valorCredito === 0 && valorDebito === 0) {
		valorCredito = parseValorMonetario(params.venda.valorcartao);
	}

	const cartoes =
		params.pagamentos?.filter(
			(item) =>
				item.meio === "CARTAO" &&
				(item.status ?? "ok") === "ok" &&
				item.valor > 0,
		) ?? [];

	const formas: PagamentoErpVendaPdv[] = [];

	if (cartoes.length > 0 && valorCredito > 0 && valorDebito === 0) {
		for (const cartao of cartoes) {
			const tipo = resolverTipoDocumentoPorFormaNfe(
				tipos,
				TPAG_CARTAO_CREDITO,
				cartao.bandeira,
			);
			if (!tipo || !tipoDocumentoGeraContasReceber(tipo)) {
				continue;
			}
			formas.push({
				idtipodocumentofinanceiro: tipo.id,
				valor: cartao.valor,
			});
		}
		return formas;
	}

	if (valorCredito > 0) {
		const tipo = resolverTipoDocumentoPorFormaNfe(
			tipos,
			TPAG_CARTAO_CREDITO,
			cartoes[0]?.bandeira,
		);
		if (tipo && tipoDocumentoGeraContasReceber(tipo)) {
			formas.push({
				idtipodocumentofinanceiro: tipo.id,
				valor: valorCredito,
			});
		}
	}

	if (valorDebito > 0) {
		const tipo = resolverTipoDocumentoPorFormaNfe(
			tipos,
			TPAG_CARTAO_DEBITO,
			cartoes[0]?.bandeira,
		);
		if (tipo && tipoDocumentoGeraContasReceber(tipo)) {
			formas.push({
				idtipodocumentofinanceiro: tipo.id,
				valor: valorDebito,
			});
		}
	}

	return formas;
}

async function gerarParcelasPorCondicaoPdv(
	parametros: GerarContasReceberVendaPdvParametros,
	valorTotal: number,
	nomeCliente: string | undefined,
	cnpjCliente: string | null,
	idtipodocumentoPadrao: string | null,
	idplanocontasPadrao: string | null,
): Promise<number> {
	const condicao = parametros.idcondicaopagto
		? await buscarCondicaoPagamentoPorId(parametros.idcondicaopagto)
		: undefined;

	if (!condicao) {
		return 0;
	}

	const { totalParcelas, prazosDias: prazosFinal } =
		resolverParcelasCondicaoPagamento(condicao);

	const valores = distribuirValor(valorTotal, totalParcelas);
	const dataAtual = new Date().toISOString().substring(0, 10);
	const dataRegistro = new Date().toISOString();

	let parcelasGeradas = 0;

	for (let i = 0; i < totalParcelas; i++) {
		const parcelaAtual = i + 1;
		const vencimento = calcularVencimento(dataAtual, prazosFinal[i] ?? 0);
		const valorParcela = valores[i] ?? 0;

		const identificacao = montarIdentificacaoFinanceiroPdv({
			numeropdv: parametros.venda.numeropdv,
			parcela: parcelaAtual,
			totalParcelas,
			nomeCliente,
		});

		const financeiro = await criarFinanceiro({
			id: uuidv4(),
			idempresa: parametros.venda.idempresa,
			identidade: parametros.identidade ?? null,
			tipo: "R",
			tipoorigem: TIPO_ORIGEM_VENDA_PDV,
			idorigem: parametros.venda.id,
			parcela: parcelaAtual,
			totalparcelas: totalParcelas,
			documento: identificacao.documento,
			emitente: identificacao.emitente,
			cnpjcpfemitente: cnpjCliente,
			idtipodocumentofinanceiro: idtipodocumentoPadrao,
			idplanocontas: idplanocontasPadrao,
			status: "A",
			emissao: dataAtual,
			vencimento,
			vencimentooriginal: vencimento,
			valor: valorParcela.toFixed(2),
			saldo: valorParcela.toFixed(2),
			historico: identificacao.historico,
			registro: dataRegistro,
			currenttimemillis: Date.now(),
		});

		if (financeiro) {
			parcelasGeradas++;
		}
	}

	return parcelasGeradas;
}

export async function gerarContasReceberVendaPdvService(
	parametros: GerarContasReceberVendaPdvParametros,
): Promise<HttpResponse<GerarContasReceberVendaPdvResposta>> {
	const formasInformadas = parametros.pagamentosErp.filter((f) => f.valor > 0);

	if (formasInformadas.length === 0) {
		return httpOk({ parcelasGeradas: 0 });
	}

	const existentes = await buscarFinanceirosPorOrigem(
		parametros.venda.idempresa,
		TIPO_ORIGEM_VENDA_PDV,
		parametros.venda.id,
	);

	if (existentes.length > 0) {
		return httpOk({ parcelasGeradas: 0 });
	}

	const formasComTipo = [];
	for (const forma of formasInformadas) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			forma.idtipodocumentofinanceiro,
		);
		if (!tipoDoc) {
			return httpBadRequest("Forma de pagamento ERP não encontrada");
		}
		if (!tipoDocumentoGeraContasReceber(tipoDoc)) {
			continue;
		}
		formasComTipo.push({ forma, tipoDoc });
	}

	if (formasComTipo.length === 0) {
		return httpOk({ parcelasGeradas: 0 });
	}

	const exigeCliente = formasComTipo.some(({ tipoDoc }) =>
		tipoDocumentoExigeClientePdv(tipoDoc),
	);

	if (exigeCliente && !parametros.identidade?.trim()) {
		return httpBadRequest("Cliente obrigatório para pagamento a prazo no PDV");
	}

	const cliente = parametros.identidade?.trim()
		? await buscarEntidadePorId(parametros.identidade)
		: undefined;

	if (parametros.identidade?.trim()) {
		if (!cliente || cliente.idempresa !== parametros.venda.idempresa) {
			return httpBadRequest("Cliente não encontrado");
		}
		if (cliente.cliente !== 1) {
			return httpBadRequest(
				"A entidade informada não está cadastrada como cliente",
			);
		}
	}

	const nomeCliente =
		cliente?.razaosocial?.trim() || cliente?.nome?.trim() || undefined;
	const valorTotalErp = formasComTipo.reduce(
		(acc, item) => acc + item.forma.valor,
		0,
	);

	if (valorTotalErp <= 0) {
		return httpOk({ parcelasGeradas: 0 });
	}

	const empresa = await buscarEmpresaPorId(parametros.venda.idempresa);
	const dataEmissao = new Date().toISOString().substring(0, 10);
	const dataRegistro = new Date().toISOString();
	let parcelasGeradas = 0;

	const idtipodocumentoPrincipal = formasComTipo[0]?.tipoDoc.id ?? null;
	const idplanocontas: string | null =
		formasComTipo[0]?.tipoDoc.idplanocontas ?? null;

	if (
		exigeCliente &&
		parametros.idcondicaopagto &&
		parametros.identidade?.trim()
	) {
		const condicao = await buscarCondicaoPagamentoPorId(
			parametros.idcondicaopagto,
		);

		if (condicao && (condicao.parcelas ?? 1) > 1) {
			const geradas = await gerarParcelasPorCondicaoPdv(
				parametros,
				valorTotalErp,
				nomeCliente,
				cliente?.cnpjcpf ?? null,
				idtipodocumentoPrincipal,
				idplanocontas,
			);

			return httpOk({ parcelasGeradas: geradas });
		}
	}

	for (const { forma, tipoDoc } of formasComTipo) {
		const idplanocontasForma = tipoDoc.idplanocontas ?? idplanocontas;
		const nomeTitulo = nomeCliente || tipoDoc.descricao?.trim() || "CONSUMIDOR";
		const identificacao = montarIdentificacaoFinanceiroPdv({
			numeropdv: parametros.venda.numeropdv,
			parcela: 1,
			totalParcelas: 1,
			nomeCliente: nomeTitulo,
		});

		const prazoFallback =
			tipoDoc.formapagamentonfe === TPAG_CARTAO_CREDITO
				? (empresa?.prazocartaocredito ?? 30)
				: tipoDoc.formapagamentonfe === TPAG_CARTAO_DEBITO
					? (empresa?.prazocartaodebito ?? 1)
					: 0;
		const prazoDias = resolverPrazoDiasTipoDocumento(tipoDoc, prazoFallback);
		const vencimento = adicionarDias(new Date(dataEmissao), prazoDias);

		const financeiro = await criarFinanceiro({
			id: uuidv4(),
			idempresa: parametros.venda.idempresa,
			identidade: parametros.identidade?.trim() || null,
			tipo: "R",
			tipoorigem: TIPO_ORIGEM_VENDA_PDV,
			idorigem: parametros.venda.id,
			parcela: 1,
			totalparcelas: 1,
			documento: identificacao.documento,
			emitente: identificacao.emitente,
			cnpjcpfemitente: cliente?.cnpjcpf ?? null,
			idtipodocumentofinanceiro: tipoDoc.id,
			idplanocontas: idplanocontasForma,
			status: "A",
			emissao: dataEmissao,
			vencimento,
			vencimentooriginal: vencimento,
			valor: formatarValorMonetario(forma.valor),
			saldo: formatarValorMonetario(forma.valor),
			historico: identificacao.historico,
			registro: dataRegistro,
			currenttimemillis: Date.now(),
		});

		if (financeiro) {
			parcelasGeradas++;
		}
	}

	return httpOk({ parcelasGeradas });
}

export async function formaErpExigeCliente(
	idtipodocumentofinanceiro: string,
): Promise<boolean> {
	const tipo = await buscarTipoDocumentoFinanceiroPorId(
		idtipodocumentofinanceiro,
	);
	if (!tipo) {
		return false;
	}
	return tipoDocumentoExigeClientePdv(tipo);
}
