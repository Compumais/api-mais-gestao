import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { emitirNfeGateway } from "@/lib/nfe-gateway-client.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarNfeSeriePorId,
	buscarNfeSeriePorNumeroSerie,
	reservarProximoNumeroSerie,
} from "@/repositories/nfe-serie-repositories.js";
import { buscarEntidadePorId } from "@/repositories/entidade-repositories.js";
import { atualizarDav } from "@/repositories/dav-repositories.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { salvarUltimaPreferenciaEmissaoNfe } from "@/service/nfe-configuracao/salvar-ultima-preferencia-emissao-nfe.js";
import {
	carregarContextoEmissaoNfe,
	montarPayloadGatewayEmissaoItens,
	type DestinatarioPayloadNfe,
	type DocumentoReferenciadoPayloadNfe,
	type ItemPayloadNfe,
	type PagamentoPayloadNfe,
	type TotaisPayloadNfe,
	type TransportePayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { resolverDocumentoReferenciadoEmissao } from "@/service/nfe-emissao/resolver-documento-referenciado-emissao.js";
import {
	emissaoRequerDocumentoReferenciado,
	FIN_NFE_DEVOLUCAO,
	FIN_NFE_NORMAL,
	resolverTipoDevolucaoEmissao,
	resolverTpNfDevolucao,
	type TipoDevolucaoNfe,
} from "@/util/cfop-devolucao-emissao-nfe.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	normalizarCStatGateway,
	normalizarCodigoStatusNfe,
	resolverStatusPersistenciaEmissao,
} from "@/util/resolver-status-emissao-nfe.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { resolverNatOpEmissaoNfe } from "@/util/resolver-nat-op-emissao-nfe.js";
import {
	normalizarIeParaNfe,
	resolverIndIeDestNfe,
} from "@/util/normalizar-ie-nfe.js";
import { normalizarGtinItensEmissao } from "@/util/normalizar-gtin-item-emissao-nfe.js";
import { normalizarItensEmissaoNfe } from "@/util/normalizar-tributacao-item-emissao-nfe.js";
import { enriquecerItensEmissaoComProduto } from "@/service/nfe-emissao/enriquecer-itens-emissao-produto.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";
import {
	montarDadosImportacaoItemEmissaoNfe,
	montarSnapshotEmissaoNfe,
	extrairDadosEmissaoNfeSalvos,
} from "@/util/dados-emissao-nfe-nota.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { integrarNotaFiscalVendaAutorizadaService } from "@/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { resolverIdeEmissaoNfe } from "@/util/resolver-ide-emissao-nfe.js";

export type EmitirNfeVendaParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal?: string;
	iddestinatario?: string;
	idserienfe?: string;
	confirmarProducao?: boolean;
	natOp?: string;
	indPres?: number;
	itens: ItemPayloadNfe[];
	totais?: TotaisPayloadNfe;
	pagamento?: PagamentoPayloadNfe;
	transporte?: TransportePayloadNfe;
	informacoesAdicionais?: string;
	documentoReferenciado?: {
		tipoDevolucao?: TipoDevolucaoNfe;
		idnotafiscalReferenciada?: string;
		chaveNfe?: string;
		xml?: string;
	};
	idplanocontas?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	idtipodocumento?: string;
	iddav?: string;
	formasPagamento?: FormaPagamentoNfVenda[];
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
};

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

type NumeracaoEmissao = {
	numeroNf: number;
	serie: string;
	idserie: string;
	idnotafiscal: string;
	reemissao: boolean;
};

function ajustarTransporteComFrete(
	transporte: TransportePayloadNfe | undefined,
	frete: number,
): TransportePayloadNfe | undefined {
	if (frete <= 0) {
		return transporte;
	}

	const modFrete = transporte?.modFrete;
	if (modFrete !== undefined && modFrete !== 9) {
		return transporte;
	}

	return {
		...transporte,
		modFrete: 0,
	};
}

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
		aliquotapis:
			item.aliquotaPis != null ? String(item.aliquotaPis) : null,
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

async function resolverNumeracaoEmissao(params: {
	idempresa: string;
	idnotafiscal?: string;
	idserienfe?: string;
	seriePadrao?: Awaited<
		ReturnType<typeof carregarContextoEmissaoNfe>
	>["seriePadrao"];
}): Promise<HttpResponse<NumeracaoEmissao>> {
	const { idempresa, idnotafiscal, idserienfe, seriePadrao } = params;

	if (idnotafiscal) {
		const notaExistente = await buscarNotaFiscalPorId(idnotafiscal);

		if (!notaExistente) {
			return httpNaoEncontrado();
		}

		if (notaExistente.idempresa !== idempresa) {
			return httpProibido();
		}

		if (notaExistente.tipoorigem !== 1) {
			return httpBadRequest("Somente NF-e de venda podem ser reemitidas");
		}

		if (notaExistente.status === NFE_STATUS.AUTORIZADA) {
			return httpBadRequest("NF-e já autorizada não pode ser reemitida");
		}

		if (
			notaExistente.status !== NFE_STATUS.REJEITADA &&
			notaExistente.status !== NFE_STATUS.PENDENTE
		) {
			return httpBadRequest(
				"Somente NF-e rejeitadas ou pendentes podem ser reemitidas",
			);
		}

		if (!notaExistente.numeronotafiscal || !notaExistente.serie) {
			return httpBadRequest("NF-e sem numeração para reemissão");
		}

		const numeroNf = Number(notaExistente.numeronotafiscal);
		if (!Number.isFinite(numeroNf) || numeroNf <= 0) {
			return httpBadRequest("Numeração da NF-e inválida para reemissão");
		}

		let idserie = notaExistente.idserie ?? undefined;
		if (!idserie) {
			const serieRegistrada = await buscarNfeSeriePorNumeroSerie(
				idempresa,
				"55",
				notaExistente.serie,
			);
			idserie = serieRegistrada?.id;
		}

		if (!idserie) {
			return httpBadRequest("Série da NF-e não encontrada para reemissão");
		}

		return httpOk({
			numeroNf,
			serie: notaExistente.serie,
			idserie,
			idnotafiscal: notaExistente.id,
			reemissao: true,
		});
	}

	let serieParaUsar = seriePadrao;
	if (idserienfe) {
		const serieBuscada = await buscarNfeSeriePorId(idserienfe);
		if (serieBuscada) serieParaUsar = serieBuscada;
	}

	if (!serieParaUsar) {
		return httpBadRequest("Nenhuma série NF-e disponível");
	}

	const reserva = await reservarProximoNumeroSerie(serieParaUsar.id);
	if (!reserva) {
		return httpBadRequest("Não foi possível reservar numeração da série");
	}

	return httpOk({
		numeroNf: reserva.numeroReservado,
		serie: reserva.serie,
		idserie: serieParaUsar.id,
		idnotafiscal: uuidv4(),
		reemissao: false,
	});
}

export async function emitirNfeVendaService(
	params: EmitirNfeVendaParametros,
): Promise<HttpResponse<ResultadoEmissaoNfeVenda>> {
	const {
		idusuario,
		idempresa,
		idnotafiscal: idnotafiscalReemissao,
		iddestinatario,
		idserienfe,
		confirmarProducao = false,
		natOp,
		indPres,
		itens,
		totais,
		pagamento,
		transporte,
		informacoesAdicionais,
		documentoReferenciado: documentoReferenciadoInput,
		idplanocontas,
		idcondicaopagto,
		idlocalestoque,
		idtipodocumento,
		iddav,
		formasPagamento,
		gerarFinanceiro,
		gerarEstoque,
	} = params;

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	if (!itens || itens.length === 0) {
		return httpBadRequest("Informe ao menos um item na nota fiscal");
	}

	const contexto = await carregarContextoEmissaoNfe(idempresa);

	if (contexto.pendencias.length > 0) {
		return httpOk({ idnotafiscal: "", pendencias: contexto.pendencias });
	}

	const { empresa, empresaFiscal, nfeConfiguracao, certificadoAtivo } = contexto;
	if (!empresa || !empresaFiscal || !nfeConfiguracao || !certificadoAtivo) {
		return httpBadRequest("Contexto de emissão incompleto. Verifique os pré-requisitos.");
	}
	const ambiente = nfeConfiguracao.ambiente;

	if (ambiente === 1 && !confirmarProducao) {
		return httpBadRequest(
			"Emissão em produção requer confirmação explícita (confirmarProducao: true)",
		);
	}

	const numeracao = await resolverNumeracaoEmissao({
		idempresa,
		idnotafiscal: idnotafiscalReemissao,
		idserienfe,
		seriePadrao: contexto.seriePadrao,
	});

	if (!numeracao.success || !numeracao.body) {
		return numeracao;
	}

	const { numeroNf, serie, idserie, idnotafiscal, reemissao } = numeracao.body;

	let idplanocontasResolvido = idplanocontas;
	let idcondicaopagtoResolvido = idcondicaopagto;
	let idlocalestoqueResolvido = idlocalestoque;
	let idtipodocumentoResolvido = idtipodocumento;
	let formasPagamentoResolvidas = formasPagamento;
	let gerarFinanceiroResolvido = gerarFinanceiro;
	let gerarEstoqueResolvido = gerarEstoque;
	let iddavResolvido = iddav;

	let emissaoSalvaReemissao: ReturnType<typeof extrairDadosEmissaoNfeSalvos> | undefined;

	if (reemissao && idnotafiscalReemissao) {
		const notaReemissao = await buscarNotaFiscalPorId(idnotafiscalReemissao);
		emissaoSalvaReemissao = notaReemissao
			? extrairDadosEmissaoNfeSalvos(notaReemissao.dadosimportacao)
			: undefined;

		idplanocontasResolvido ??= notaReemissao?.idplanocontas ?? undefined;
		idcondicaopagtoResolvido ??= notaReemissao?.idcondicaopagto ?? undefined;
		idlocalestoqueResolvido ??= notaReemissao?.idlocalestoque ?? undefined;
		idtipodocumentoResolvido ??= notaReemissao?.idtipodocumento ?? undefined;
		formasPagamentoResolvidas ??= emissaoSalvaReemissao?.formasPagamento;
		gerarFinanceiroResolvido ??= emissaoSalvaReemissao?.gerarFinanceiro;
		gerarEstoqueResolvido ??= emissaoSalvaReemissao?.gerarEstoque;
		iddavResolvido ??= emissaoSalvaReemissao?.iddav;
	}

	const freteComercial = totais?.frete ?? 0;
	const transporteAjustado = ajustarTransporteComFrete(transporte, freteComercial);

	let destinatario: DestinatarioPayloadNfe | undefined;
	let identidade: string | undefined;
	if (iddestinatario) {
		const entidade = await buscarEntidadePorId(iddestinatario);
		if (entidade) {
			identidade = entidade.id;
			const indIEDest = resolverIndIeDestNfe({
				inscricaoestadual: entidade.inscricaoestadual,
				indiedest: entidade.indiedest,
				cnpjcpf: entidade.cnpjcpf,
			});
			destinatario = {
				cnpjcpf: entidade.cnpjcpf ?? undefined,
				razaosocial: entidade.razaosocial ?? entidade.nome,
				ie: normalizarIeParaNfe(entidade.inscricaoestadual, indIEDest),
				logradouro: entidade.endereco ?? undefined,
				numero: entidade.numeroendereco ?? undefined,
				bairro: entidade.bairro ?? undefined,
				cep: entidade.cep ?? undefined,
				estado: entidade.idestado ?? undefined,
				codigomunicipioibge: entidade.idcidade ?? undefined,
				pais: entidade.pais ?? undefined,
				indIEDest,
			};
		}
	}

	const natOpResolvida = await resolverNatOpEmissaoNfe({
		idempresa,
		natOp,
		cfopItem: itens[0]?.cfop,
	});

	const requerReferencia = await emissaoRequerDocumentoReferenciado(
		idempresa,
		itens.map((item) => item.cfop),
	);

	const tipoDevolucao = await resolverTipoDevolucaoEmissao(
		idempresa,
		itens.map((item) => item.cfop),
		documentoReferenciadoInput?.tipoDevolucao,
	);

	let documentoReferenciado: DocumentoReferenciadoPayloadNfe | undefined;
	if (documentoReferenciadoInput) {
		const resolvido = await resolverDocumentoReferenciadoEmissao(idempresa, {
			tipoDevolucao: documentoReferenciadoInput.tipoDevolucao ?? tipoDevolucao ?? "compra",
			idnotafiscalReferenciada: documentoReferenciadoInput.idnotafiscalReferenciada,
			chaveNfe: documentoReferenciadoInput.chaveNfe,
			xml: documentoReferenciadoInput.xml,
		});

		if (!resolvido.success) {
			return resolvido;
		}

		documentoReferenciado = resolvido.body ?? undefined;
	} else if (idnotafiscalReemissao) {
		const notaExistenteRef = await buscarNotaFiscalPorId(idnotafiscalReemissao);
		const chavePersistida = notaExistenteRef?.chavedocumentoreferenciado?.replace(/\D/g, "");
		if (chavePersistida?.length === 44) {
			documentoReferenciado = {
				chave: chavePersistida,
				modelo: notaExistenteRef?.modelodocumentoreferenciado ?? "55",
				serie: notaExistenteRef?.seriedocumentoreferenciado ?? undefined,
				numero: notaExistenteRef?.numerodocumentoreferenciado ?? undefined,
				dataEmissao: notaExistenteRef?.datadocumentoreferenciado ?? undefined,
			};
		}
	}

	if (requerReferencia && !documentoReferenciado?.chave) {
		const mensagem =
			tipoDevolucao === "venda"
				? "CFOP de devolução de venda exige referência à NF-e de saída. Informe a nota de venda ou a chave/XML."
				: "CFOP de devolução de compra exige referência à NF-e de entrada. Informe a nota de compra ou a chave/XML.";
		return httpBadRequest(mensagem);
	}

	const finNFe = requerReferencia ? FIN_NFE_DEVOLUCAO : FIN_NFE_NORMAL;
	const tpNF =
		requerReferencia && tipoDevolucao
			? resolverTpNfDevolucao(tipoDevolucao)
			: 1;

	const crt = empresaFiscal.crt ?? 3;
	const itensEnriquecidos = await enriquecerItensEmissaoComProduto(itens);
	const itensNormalizados = normalizarGtinItensEmissao(
		normalizarItensEmissaoNfe(crt, itensEnriquecidos),
	);

	const vProd = itens.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const vFrete = totais?.frete ?? 0;
	const vDesc = totais?.desconto ?? 0;
	const totaisFiscaisPrevia = calcularTotaisFiscaisEmissaoNfe(
		crt,
		itensNormalizados,
		totais ?? {},
	);

	let pagamentoResolvido = pagamento;
	if (
		(!pagamento?.formas || pagamento.formas.length === 0) &&
		idtipodocumentoResolvido
	) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			idtipodocumentoResolvido,
		);
		if (tipoDoc?.formapagamentonfe) {
			pagamentoResolvido = {
				formas: [
					{
						tPag: tipoDoc.formapagamentonfe,
						vPag: totaisFiscaisPrevia.totalNota,
						indPag: tipoDoc.aprazo === 1 ? 1 : 0,
					},
				],
			};
		}
	}

	const pagamentoNormalizado = normalizarPagamentoEmissaoNfe(pagamentoResolvido, {
		finNFe,
		valorNota: totaisFiscaisPrevia.totalNota,
	});

	const ideEmissao = resolverIdeEmissaoNfe({
		ufEmitente: empresaFiscal.uf,
		ufDestinatario: destinatario?.estado,
		paisDestinatario: destinatario?.pais,
		indPres:
			indPres ??
			emissaoSalvaReemissao?.indPres ??
			nfeConfiguracao.ultimoindpres,
		finNFe,
	});

	const payload = montarPayloadGatewayEmissaoItens({
		empresa,
		empresaFiscal,
		nfeConfiguracao,
		certificadoAtivo,
		numeroNf,
		serie,
		destinatario,
		itens: itensNormalizados,
		totais,
		pagamento: pagamentoNormalizado,
		transporte: transporteAjustado,
		natOp: natOpResolvida,
		informacoesAdicionais,
		finNFe,
		tpNF,
		documentosReferenciados: documentoReferenciado ? [documentoReferenciado] : [],
		indPres: ideEmissao.indPres,
	});

	const respostaGateway = await emitirNfeGateway(payload);

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

	const totaisFiscais = totaisFiscaisPrevia;
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
