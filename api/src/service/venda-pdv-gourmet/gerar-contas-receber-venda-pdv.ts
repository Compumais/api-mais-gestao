import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { VendaPdvGourmet } from "@/model/venda-pdv-gourmet-model.js";
import { buscarCondicaoPagamentoPorId } from "@/repositories/condicao-pagamento-repositories.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import {
	buscarFinanceirosPorOrigem,
	criarFinanceiro,
} from "@/repositories/financeiro-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { montarIdentificacaoFinanceiroPdv } from "@/util/financeiro-pdv-util.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import {
	adicionarDias,
	formatarValorMonetario,
	TIPO_ORIGEM_VENDA_PDV,
} from "@/util/recebimentos-venda-util.js";
import { resolverParcelasCondicaoPagamento } from "@/util/resolver-parcelas-condicao-pagamento.js";
import {
	resolverDestinoFinanceiroFormaPagamento,
	resolverPrazoDiasTipoDocumento,
} from "@/util/resolver-financeiro-emissao-nfe.js";

export type PagamentoErpVendaPdv = {
	idtipodocumentofinanceiro: string;
	valor: number;
};

type GerarContasReceberVendaPdvParametros = {
	venda: VendaPdvGourmet;
	idusuario: string;
	identidade: string;
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

async function gerarParcelasPorCondicaoPdv(
	parametros: GerarContasReceberVendaPdvParametros,
	valorTotal: number,
	nomeCliente: string | undefined,
	cnpjCliente: string | null,
	idtipodocumentoPadrao: string | null,
	idplanocontasPadrao: string | null,
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
			identidade: parametros.identidade,
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
	const formas = parametros.pagamentosErp.filter((f) => f.valor > 0);

	if (formas.length === 0) {
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

	if (!parametros.identidade?.trim()) {
		return httpBadRequest(
			"Cliente obrigatório para pagamento a prazo no PDV",
		);
	}

	const cliente = await buscarEntidadePorId(parametros.identidade);

	if (!cliente || cliente.idempresa !== parametros.venda.idempresa) {
		return httpBadRequest("Cliente não encontrado");
	}

	if (cliente.cliente !== 1) {
		return httpBadRequest("A entidade informada não está cadastrada como cliente");
	}

	for (const forma of formas) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			forma.idtipodocumentofinanceiro,
		);

		if (!tipoDoc) {
			return httpBadRequest("Forma de pagamento ERP não encontrada");
		}

		if (tipoDoc.aprazo === 1 && !parametros.identidade) {
			return httpBadRequest(
				"Cliente obrigatório para forma de pagamento a prazo",
			);
		}
	}

	const nomeCliente =
		cliente.razaosocial?.trim() || cliente.nome?.trim() || undefined;
	const valorTotalErp = formas.reduce((acc, f) => acc + f.valor, 0);

	if (valorTotalErp <= 0) {
		return httpOk({ parcelasGeradas: 0 });
	}

	const dataEmissao = new Date().toISOString().substring(0, 10);
	const dataRegistro = new Date().toISOString();
	let parcelasGeradas = 0;

	const idtipodocumentoPrincipal = formas[0]?.idtipodocumentofinanceiro ?? null;
	let idplanocontas: string | null = null;

	if (idtipodocumentoPrincipal) {
		const tipoPrincipal = await buscarTipoDocumentoFinanceiroPorId(
			idtipodocumentoPrincipal,
		);
		idplanocontas = tipoPrincipal?.idplanocontas ?? null;
	}

	if (parametros.idcondicaopagto) {
		const condicao = await buscarCondicaoPagamentoPorId(
			parametros.idcondicaopagto,
		);

		if (condicao && (condicao.parcelas ?? 1) > 1) {
			const geradas = await gerarParcelasPorCondicaoPdv(
				parametros,
				valorTotalErp,
				nomeCliente,
				cliente.cnpjcpf ?? null,
				idtipodocumentoPrincipal,
				idplanocontas,
			);

			return httpOk({ parcelasGeradas: geradas });
		}
	}

	for (const forma of formas) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			forma.idtipodocumentofinanceiro,
		);

		if (!tipoDoc) continue;

		const destino = resolverDestinoFinanceiroFormaPagamento(tipoDoc);
		const idplanocontasForma = tipoDoc.idplanocontas ?? idplanocontas;

		const identificacao = montarIdentificacaoFinanceiroPdv({
			numeropdv: parametros.venda.numeropdv,
			parcela: 1,
			totalParcelas: 1,
			nomeCliente,
		});

		if (destino === "caixa_imediato") {
			continue;
		}

		const prazoDias = resolverPrazoDiasTipoDocumento(tipoDoc);
		const vencimento =
			destino === "titulo_vista"
				? dataEmissao
				: adicionarDias(new Date(dataEmissao), prazoDias);

		const financeiro = await criarFinanceiro({
			id: uuidv4(),
			idempresa: parametros.venda.idempresa,
			identidade: parametros.identidade,
			tipo: "R",
			tipoorigem: TIPO_ORIGEM_VENDA_PDV,
			idorigem: parametros.venda.id,
			parcela: 1,
			totalparcelas: 1,
			documento: identificacao.documento,
			emitente: identificacao.emitente,
			cnpjcpfemitente: cliente.cnpjcpf ?? null,
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
