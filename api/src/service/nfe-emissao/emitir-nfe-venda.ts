import { v4 as uuidv4 } from "uuid";
import { emitirNfeGateway } from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { atualizarDav } from "@/repositories/dav-repositories.js";
import {
	atualizarNotaFiscal,
	criarNotaFiscalComItens,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { salvarUltimaPreferenciaEmissaoNfe } from "@/service/nfe-configuracao/salvar-ultima-preferencia-emissao-nfe.js";
import type {
	DestinatarioPayloadNfe,
	DocumentoReferenciadoPayloadNfe,
	ItemPayloadNfe,
	PagamentoPayloadNfe,
	TotaisPayloadNfe,
	TransportePayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	type PayloadEmissaoNfeVendaPreparado,
	type PrepararPayloadEmissaoNfeVendaParams,
	prepararPayloadEmissaoNfeVenda,
} from "@/service/nfe-emissao/preparar-payload-emissao-nfe-venda.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { integrarNotaFiscalVendaAutorizadaService } from "@/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.js";
import type { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import {
	FIN_NFE_NORMAL,
	type TipoDevolucaoNfe,
} from "@/util/cfop-devolucao-emissao-nfe.js";
import {
	montarDadosImportacaoItemEmissaoNfe,
	montarSnapshotEmissaoNfe,
} from "@/util/dados-emissao-nfe-nota.js";
import { httpOk } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	normalizarCodigoStatusNfe,
	normalizarCStatGateway,
	resolverStatusPersistenciaEmissao,
} from "@/util/resolver-status-emissao-nfe.js";

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

function montarItensPersistencia(
	idnotafiscal: string,
	itens: ItemPayloadNfe[],
): NovoNotaFiscalItem[] {
	return itens.map((item, index) => ({
		id: uuidv4(),
		idnotafiscal,
		idproduto: item.idproduto ?? null,
		descricao: item.descricao,
		quantidade: String(item.quantidade),
		precounitario: String(item.valorUnitario),
		total: String(item.quantidade * item.valorUnitario),
		cfop: item.cfop,
		ncm: item.ncm,
		unidade: item.unidade,
		situacaotributaria: item.cst ?? item.csosn ?? null,
		cstpis: item.cstPis ?? null,
		cstcofins: item.cstCofins ?? null,
		aliquotapis: item.aliquotaPis != null ? String(item.aliquotaPis) : null,
		aliquotacofins:
			item.aliquotaCofins != null ? String(item.aliquotaCofins) : null,
		baseicms: item.baseIcms != null ? String(item.baseIcms) : null,
		percentualicms:
			item.aliquotaIcms != null ? String(item.aliquotaIcms) : null,
		icms: item.valorIcms != null ? String(item.valorIcms) : null,
		ipi: item.valorIpi != null ? String(item.valorIpi) : null,
		origem: item.orig ?? 0,
		contador: index + 1,
		tipo: "P",
		currenttimemillis: Date.now(),
		dadosimportacao: montarDadosImportacaoItemEmissaoNfe(item) ?? null,
	}));
}

function montarDadosNotaPersistencia(params: {
	idnotafiscal: string;
	idempresa: string;
	idusuario: string;
	identidade?: string;
	destinatario?: DestinatarioPayloadNfe;
	numeroNf: number;
	serie: string;
	ambiente: number;
	valortotalnota: string;
	vProd: number;
	vFrete: number;
	vDesc: number;
	statusPersistido: number;
	resposta: {
		chave?: string;
		protocolo?: string;
		xmlEnviado?: string;
		xmlRetorno?: string;
		xMotivo?: string;
	};
	cStatProtocolo: number | null;
	cStatTransmissao: number | null;
	mensagemTransmissao: string | null;
	informacoesAdicionais?: string;
	documentoReferenciado?: DocumentoReferenciadoPayloadNfe;
	finNFe?: number;
	agora: string;
	dataEmissao: string;
	totaisFiscais?: ReturnType<typeof calcularTotaisFiscaisEmissaoNfe>;
	natOp?: string;
	pagamento?: PagamentoPayloadNfe;
	transporte?: TransportePayloadNfe;
	totaisComerciais?: TotaisPayloadNfe;
	tipoDevolucao?: TipoDevolucaoNfe;
	indPres?: number;
	idDest?: number;
	idserie?: string;
	idplanocontas?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	idtipodocumento?: string;
	iddav?: string;
	iddavs?: string[];
	codigosPedidos?: number[];
	formasPagamento?: FormaPagamentoNfVenda[];
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
}): NovaNotaFiscal {
	const {
		idnotafiscal,
		idempresa,
		idusuario,
		identidade,
		destinatario,
		numeroNf,
		serie,
		idserie,
		ambiente,
		valortotalnota,
		vProd,
		vFrete,
		vDesc,
		statusPersistido,
		resposta,
		cStatProtocolo,
		cStatTransmissao,
		mensagemTransmissao,
		informacoesAdicionais,
		documentoReferenciado,
		finNFe,
		agora,
		dataEmissao,
		totaisFiscais,
		natOp,
		pagamento,
		transporte,
		totaisComerciais,
		tipoDevolucao,
		indPres,
		idDest,
		idplanocontas,
		idcondicaopagto,
		idlocalestoque,
		idtipodocumento,
		iddav,
		iddavs,
		codigosPedidos,
		formasPagamento,
		gerarFinanceiro,
		gerarEstoque,
	} = params;

	const totais = totaisFiscais;

	return {
		id: idnotafiscal,
		idempresa,
		identidade: identidade ?? null,
		idplanocontas: idplanocontas ?? null,
		idcondicaopagto: idcondicaopagto ?? null,
		idlocalestoque: idlocalestoque ?? null,
		idtipodocumento: idtipodocumento ?? null,
		idusuarioinclusao: idusuario,
		datainclusao: agora,
		emissao: dataEmissao,
		datahoraemissao: agora,
		currenttimemillis: Date.now(),
		modelo: "55",
		serie,
		idserie: idserie ?? null,
		numeronotafiscal: String(numeroNf),
		chavenfe: resposta.chave ?? null,
		protocolonfe: resposta.protocolo ?? null,
		tipoambientenfe: ambiente,
		tipoorigem: 1,
		status: statusPersistido,
		razaosocial: destinatario?.razaosocial ?? null,
		cnpjcpf: destinatario?.cnpjcpf ?? null,
		inscricaoestadual: destinatario?.ie ?? null,
		endereco: destinatario?.logradouro ?? null,
		numeroendereco: destinatario?.numero ?? null,
		bairro: destinatario?.bairro ?? null,
		cep: destinatario?.cep ?? null,
		cidade: destinatario?.cidade ?? null,
		estado: destinatario?.estado ?? null,
		valortotalnota: totais ? totais.totalNota.toFixed(2) : valortotalnota,
		totalproduto: totais ? totais.totalProdutos.toFixed(2) : vProd.toFixed(2),
		frete:
			totais && totais.frete > 0
				? totais.frete.toFixed(2)
				: vFrete > 0
					? vFrete.toFixed(2)
					: null,
		seguro: totais && totais.seguro > 0 ? totais.seguro.toFixed(2) : null,
		descontosubtotal:
			totais && totais.desconto > 0
				? totais.desconto.toFixed(2)
				: vDesc > 0
					? vDesc.toFixed(2)
					: null,
		outrasdespesas:
			totais && totais.outrasDespesas > 0
				? totais.outrasDespesas.toFixed(2)
				: totaisComerciais && (totaisComerciais.outrasDespesas ?? 0) > 0
					? Number(totaisComerciais.outrasDespesas).toFixed(2)
					: null,
		tipofrete: transporte?.modFrete ?? 9,
		baseicms: totais ? totais.baseIcms.toFixed(2) : null,
		icms: totais ? totais.valorIcms.toFixed(2) : null,
		ipi: totais && totais.valorIpi > 0 ? totais.valorIpi.toFixed(2) : null,
		pis: totais ? totais.valorPis.toFixed(2) : null,
		cofins: totais ? totais.valorCofins.toFixed(2) : null,
		baseicmssubstituicao:
			totais && totais.baseIcmsSt > 0 ? totais.baseIcmsSt.toFixed(2) : null,
		icmssubstituicao:
			totais && totais.valorIcmsSt > 0 ? totais.valorIcmsSt.toFixed(2) : null,
		arquivoxmlassinado: resposta.xmlEnviado ?? null,
		arquivoxmlautorizada:
			statusPersistido === NFE_STATUS.AUTORIZADA
				? (resposta.xmlRetorno ?? null)
				: null,
		mensagemtransmissaonfe: mensagemTransmissao,
		codigostatusprotocolonfe: cStatProtocolo,
		codigostatustransmissaonfe: cStatTransmissao,
		observacao: informacoesAdicionais ?? null,
		finalidadeemissaonfe: finNFe ?? FIN_NFE_NORMAL,
		chavedocumentoreferenciado: documentoReferenciado?.chave ?? null,
		modelodocumentoreferenciado: documentoReferenciado ? "55" : null,
		seriedocumentoreferenciado: documentoReferenciado?.serie ?? null,
		numerodocumentoreferenciado: documentoReferenciado?.numero ?? null,
		datadocumentoreferenciado: documentoReferenciado?.dataEmissao ?? null,
		tiponotadocumentoreferenciado: documentoReferenciado ? "NFE" : null,
		dadosimportacao: montarSnapshotEmissaoNfe({
			natOp,
			indPres,
			idDest,
			idserienfe: idserie,
			iddav,
			iddavs,
			codigosPedidos,
			formasPagamento: formasPagamento?.map((forma) => ({
				idtipodocumentofinanceiro: forma.idtipodocumentofinanceiro,
				valor: forma.valor,
				...(forma.indPag !== undefined ? { indPag: forma.indPag } : {}),
			})),
			gerarFinanceiro,
			gerarEstoque,
			pagamento,
			transporte,
			totais: totaisComerciais ?? {
				frete: totais?.frete ?? vFrete,
				seguro: totais?.seguro,
				desconto: totais?.desconto ?? vDesc,
				outrasDespesas: totais?.outrasDespesas,
			},
			documentoReferenciado: documentoReferenciado
				? {
						...(tipoDevolucao ? { tipoDevolucao } : {}),
						...(documentoReferenciado.idnotafiscalReferenciada
							? {
									idnotafiscalReferenciada:
										documentoReferenciado.idnotafiscalReferenciada,
								}
							: {}),
						chave: documentoReferenciado.chave,
					}
				: undefined,
		}),
	};
}

export async function emitirNfeVendaService(
	params: EmitirNfeVendaParametros,
): Promise<HttpResponse<ResultadoEmissaoNfeVenda>> {
	const preparado = await prepararPayloadEmissaoNfeVenda(params, {
		modo: "emitir",
	});

	if (!preparado.success) {
		return {
			success: false,
			status: preparado.status,
			error: preparado.error,
			code: preparado.code,
		};
	}

	if (!preparado.body) {
		return {
			success: false,
			status: preparado.status,
			error: "Falha ao preparar emissão",
			code: "PREPARACAO_EMISSAO",
		};
	}

	if ("idnotafiscal" in preparado.body && preparado.body.idnotafiscal === "") {
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
		iddavsResolvidos,
		codigosPedidosResolvidos,
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

	const agora = agoraBrasiliaIsoOffset();
	const dataEmissao = hojeBrasiliaIsoDate();

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
		iddavs: iddavsResolvidos,
		codigosPedidos: codigosPedidosResolvidos,
		formasPagamento: formasPagamentoResolvidas,
		gerarFinanceiro: gerarFinanceiroResolvido,
		gerarEstoque: gerarEstoqueResolvido,
	});

	const itensPersistencia = montarItensPersistencia(
		idnotafiscal,
		itensNormalizados,
	);

	if (reemissao) {
		const { id, datainclusao, idusuarioinclusao, ...dadosAtualizacao } =
			dadosNota;
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
		const idsDavParaAtualizar =
			iddavsResolvidos && iddavsResolvidos.length > 0
				? iddavsResolvidos
				: iddavResolvido
					? [iddavResolvido]
					: [];

		for (const idDav of idsDavParaAtualizar) {
			await atualizarDav(idDav, {
				idnotafiscal,
				datahorafaturamento: agora,
				idusuariofaturamento: idusuario,
				status: 4,
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
