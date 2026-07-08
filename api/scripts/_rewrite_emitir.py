from pathlib import Path

path = Path("src/service/nfe-emissao/emitir-nfe-venda.ts")
text = path.read_text(encoding="utf-8")

start_montar_itens = text.index("function montarItensPersistencia")
start_resolver = text.index("async function resolverNumeracaoEmissao")
helpers_full = text[start_montar_itens:start_resolver]

new_header = '''import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { emitirNfeGateway } from "@/lib/nfe-gateway-client.js";
import {
	atualizarNotaFiscal,
	criarNotaFiscalComItens,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { atualizarDav } from "@/repositories/dav-repositories.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { salvarUltimaPreferenciaEmissaoNfe } from "@/service/nfe-configuracao/salvar-ultima-preferencia-emissao-nfe.js";
import {
	type DestinatarioPayloadNfe,
	type DocumentoReferenciadoPayloadNfe,
	type ItemPayloadNfe,
	type PagamentoPayloadNfe,
	type TotaisPayloadNfe,
	type TransportePayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	prepararPayloadEmissaoNfeVenda,
	type PrepararPayloadEmissaoNfeVendaParams,
	type PayloadEmissaoNfeVendaPreparado,
} from "@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js";
import { FIN_NFE_NORMAL, type TipoDevolucaoNfe } from "@/util/cfop-devolucao-emissao-nfe.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	normalizarCStatGateway,
	normalizarCodigoStatusNfe,
	resolverStatusPersistenciaEmissao,
} from "@/util/resolver-status-emissao-nfe.js";
import { httpOk } from "@/util/http-util.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import {
	montarDadosImportacaoItemEmissaoNfe,
	montarSnapshotEmissaoNfe,
} from "@/util/dados-emissao-nfe-nota.js";
import { integrarNotaFiscalVendaAutorizadaService } from "@/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";

export type EmitirNfeVendaParametros = PrepararPayloadEmissaoNfeVendaParams;

export type ResultadoEmissaoNfeVenda = {
	idnotafiscal: string;
	chave?: string;
	protocolo?: string;
	cStat?: string;
	xMotivo?: string;
	ambiente?: number;
	reemissao?: boolean;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
	integracao?: {
		parcelasGeradas: number;
		lancamentosCaixa: number;
		movimentosGerados: number;
		avisos: string[];
	};
};

'''

emit_fn = '''
export async function emitirNfeVendaService(
	params: EmitirNfeVendaParametros,
): Promise<HttpResponse<ResultadoEmissaoNfeVenda>> {
	const preparado = await prepararPayloadEmissaoNfeVenda(params, { modo: "emitir" });

	if (!preparado.success || !preparado.body) {
		return preparado;
	}

	if ("pendencias" in preparado.body && preparado.body.pendencias) {
		return httpOk({
			idnotafiscal: "",
			pendencias: preparado.body.pendencias,
		});
	}

	const prep = preparado.body as PayloadEmissaoNfeVendaPreparado;

	const { idusuario, idempresa, itens } = params;

	const {
		numeracao,
		ambiente,
		destinatario,
		identidade,
		itensNormalizados,
		transporteAjustado,
		natOpResolvida,
		pagamentoNormalizado,
		documentoReferenciado,
		finNFe,
		ideEmissao,
		totaisFiscais,
		vProd,
		vFrete,
		vDesc,
		payloadGateway,
		idplanocontasResolvido,
		idcondicaopagtoResolvido,
		idlocalestoqueResolvido,
		idtipodocumentoResolvido,
		formasPagamentoResolvidas,
		gerarFinanceiroResolvido,
		gerarEstoqueResolvido,
		iddavResolvido,
		informacoesAdicionais,
		totais,
		tipoDevolucao,
	} = prep;

	const { numeroNf, serie, idserie, idnotafiscal, reemissao } = numeracao;

	const respostaGateway = await emitirNfeGateway(payloadGateway);

	const cStat = normalizarCStatGateway(respostaGateway.cStat);
	const cStatLote = normalizarCStatGateway(respostaGateway.cStatLote);
	const xMotivo =
		respostaGateway.xMotivo?.trim() ||
		(!respostaGateway.sucesso ? respostaGateway.erro?.trim() : undefined) ||
		null;
	const erroTransmissao =
		!respostaGateway.sucesso && !cStat ? (respostaGateway.erro ?? null) : null;

	const statusPersistido = resolverStatusPersistenciaEmissao({
		cStat,
		protocolo: respostaGateway.protocolo,
		erroTransmissao,
	});

	const cStatProtocolo = normalizarCodigoStatusNfe(cStat);
	const cStatTransmissao = normalizarCodigoStatusNfe(cStatLote ?? cStat);

	const agora = new Date().toISOString();
	const dataEmissao = agora.slice(0, 10);

	const valortotalnota = totaisFiscais.totalNota.toFixed(2);

	const dadosNota = montarDadosNotaPersistencia({
		idnotafiscal,
		idempresa,
		idusuario,
		identidade,
		destinatario,
		numeroNf,
		serie,
		ambiente,
		valortotalnota,
		vProd,
		vFrete,
		vDesc,
		statusPersistido,
		resposta: {
			chave: respostaGateway.chave,
			protocolo: respostaGateway.protocolo,
			xmlEnviado: respostaGateway.xmlEnviado,
			xmlRetorno: respostaGateway.xmlRetorno,
			xMotivo: xMotivo ?? undefined,
		},
		cStatProtocolo,
		cStatTransmissao,
		mensagemTransmissao: xMotivo,
		informacoesAdicionais,
		documentoReferenciado,
		finNFe,
		agora,
		dataEmissao,
		totaisFiscais,
		natOp: natOpResolvida,
		indPres: ideEmissao.indPres,
		idDest: ideEmissao.idDest,
		pagamento: pagamentoNormalizado,
		transporte: transporteAjustado,
		totaisComerciais: totais,
		tipoDevolucao: tipoDevolucao ?? undefined,
		idserie,
		idplanocontas: idplanocontasResolvido,
		idcondicaopagto: idcondicaopagtoResolvido,
		idlocalestoque: idlocalestoqueResolvido,
		idtipodocumento: idtipodocumentoResolvido,
		iddav: iddavResolvido,
		formasPagamento: formasPagamentoResolvidas,
		gerarFinanceiro: gerarFinanceiroResolvido,
		gerarEstoque: gerarEstoqueResolvido,
	});

	const itensPersistencia = montarItensPersistencia(idnotafiscal, itensNormalizados);

	if (reemissao) {
		const { id, datainclusao, idusuarioinclusao, ...dadosAtualizacao } = dadosNota;
		void id;
		void datainclusao;
		void idusuarioinclusao;

		await atualizarNotaFiscal(idnotafiscal, dadosAtualizacao);
		await substituirItensNotaFiscal(idnotafiscal, itensPersistencia);
	} else {
		await criarNotaFiscalComItens(dadosNota, itensPersistencia);
	}

	if (respostaGateway.xmlEnviado && respostaGateway.chave) {
		await arquivarXmlNotaFiscal({
			idnotafiscal,
			idempresa,
			xml: respostaGateway.xmlEnviado,
			chavenfe: respostaGateway.chave,
			tipo: "assinado",
		}).catch(console.error);
	}

	if (
		statusPersistido === NFE_STATUS.AUTORIZADA &&
		respostaGateway.xmlRetorno &&
		respostaGateway.chave
	) {
		await arquivarXmlNotaFiscal({
			idnotafiscal,
			idempresa,
			xml: respostaGateway.xmlRetorno,
			chavenfe: respostaGateway.chave,
			protocolonfe: respostaGateway.protocolo,
			tipo: "autorizado",
		}).catch(console.error);
	}

	await salvarUltimaPreferenciaEmissaoNfe({
		idempresa,
		cfop: itens[0]?.cfop,
		natOp: natOpResolvida,
		idserie,
		indPres: ideEmissao.indPres,
	}).catch(console.error);

	const corpo: ResultadoEmissaoNfeVenda = { idnotafiscal, ambiente, reemissao };
	if (respostaGateway.chave) corpo.chave = respostaGateway.chave;
	if (respostaGateway.protocolo) corpo.protocolo = respostaGateway.protocolo;
	if (cStat) corpo.cStat = cStat;
	if (xMotivo) corpo.xMotivo = xMotivo;

	if (statusPersistido === NFE_STATUS.AUTORIZADA) {
		if (iddavResolvido) {
			await atualizarDav(iddavResolvido, {
				idnotafiscal,
				datahorafaturamento: agora,
				idusuariofaturamento: idusuario,
			}).catch(console.error);
		}

		const integracao = await integrarNotaFiscalVendaAutorizadaService({
			idusuario,
			idnotafiscal,
			gerarFinanceiro: gerarFinanceiroResolvido,
			gerarEstoque: gerarEstoqueResolvido,
		}).catch((erro) => {
			console.error("Erro na integração operacional da NF venda:", erro);
			return null;
		});

		if (integracao?.success && integracao.body) {
			corpo.integracao = integracao.body;
		}
	}

	return httpOk(corpo);
}
'''

path.write_text(new_header + helpers_full + emit_fn, encoding="utf-8")
print("ok", path.stat().st_size)
