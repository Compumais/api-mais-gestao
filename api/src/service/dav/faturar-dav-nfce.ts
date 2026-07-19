import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import { emitirNfeGateway } from "@/lib/nfe-gateway-client.js";
import { atualizarDav, buscarDavPorId } from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
	atualizarNotaFiscal,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarNfeSeriePadrao,
	buscarNfeSeriePorNumeroSerie,
	reservarProximoNumeroSerie,
} from "@/repositories/nfe-serie-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { integrarNotaFiscalVendaAutorizadaService } from "@/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.js";
import { enriquecerItensEmissaoComProduto } from "@/service/nfe-emissao/enriquecer-itens-emissao-produto.js";
import {
	carregarContextoEmissaoNfce,
	montarPayloadGatewayEmissaoNfce,
} from "@/service/nfce-emissao/contexto-emissao-nfce.js";
import { aplicarCreditoIcmsSnItensEmissao } from "@/service/nfe-emissao/aplicar-credito-icms-sn-itens.js";
import type { ResultadoEmissaoNfcePdv } from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { montarItensEmissaoDav } from "@/service/dav/montar-itens-emissao-dav.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { montarDadosImportacaoItemEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";
import { montarPagamentosPdvParaNfce } from "@/util/montar-pagamentos-pdv-nfce.js";
import { montarDestinatarioPorIdentidade } from "@/util/montar-destinatario-entidade-nfe.js";
import { normalizarGtinItensEmissao } from "@/util/normalizar-gtin-item-emissao-nfe.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";
import { normalizarItensEmissaoNfe } from "@/util/normalizar-tributacao-item-emissao-nfe.js";
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
import { extrairQrCodeNfceXml } from "@/util/extrair-qr-code-nfce-xml.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import type { PagamentoPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	complementarCardPagamentoNfe,
	exigeGrupoCard,
	montarCardPagamentoNfce,
	normalizarTPag,
} from "@/util/card-pagamento-nfce.js";

type FaturarDavNfceParametros = {
	idusuario: string;
	iddav: string;
	idempresa: string;
	gerarFinanceiro?: boolean | undefined;
	gerarEstoque?: boolean | undefined;
};

type NumeracaoEmissaoNfce = {
	idnotafiscal: string;
	numeroNf: number;
	serie: string;
	idserie: string;
	reemissao: boolean;
};

async function resolverNumeracaoEmissaoNfce(
	idempresa: string,
	idnotafiscalDav: string | null | undefined,
	serieParaUsar: NonNullable<Awaited<ReturnType<typeof buscarNfeSeriePadrao>>>,
): Promise<NumeracaoEmissaoNfce | null> {
	if (idnotafiscalDav) {
		const notaExistente = await buscarNotaFiscalPorId(idnotafiscalDav);

		if (
			notaExistente &&
			notaExistente.idempresa === idempresa &&
			(notaExistente.status === NFE_STATUS.REJEITADA ||
				notaExistente.status === NFE_STATUS.PENDENTE)
		) {
			const numeroNf = Number(notaExistente.numeronotafiscal);
			if (
				!notaExistente.numeronotafiscal ||
				!notaExistente.serie ||
				!Number.isFinite(numeroNf) ||
				numeroNf <= 0
			) {
				return null;
			}

			let idserie = notaExistente.idserie ?? undefined;
			if (!idserie) {
				const serieRegistrada = await buscarNfeSeriePorNumeroSerie(
					idempresa,
					"65",
					notaExistente.serie,
				);
				idserie = serieRegistrada?.id;
			}

			if (!idserie) return null;

			return {
				idnotafiscal: notaExistente.id,
				numeroNf,
				serie: notaExistente.serie,
				idserie,
				reemissao: true,
			};
		}
	}

	const reserva = await reservarProximoNumeroSerie(serieParaUsar.id);
	if (!reserva) return null;

	return {
		idnotafiscal: uuidv4(),
		numeroNf: reserva.numeroReservado,
		serie: reserva.serie,
		idserie: serieParaUsar.id,
		reemissao: false,
	};
}

function montarItensPersistencia(
	idnotafiscal: string,
	itens: Awaited<ReturnType<typeof enriquecerItensEmissaoComProduto>>,
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

function parseValor(valor: string | null | undefined): number {
	if (!valor) return 0;
	const n = Number.parseFloat(String(valor).replace(",", "."));
	return Number.isFinite(n) ? n : 0;
}

async function montarPagamentoDavParaNfce(
	dav: NonNullable<Awaited<ReturnType<typeof buscarDavPorId>>>,
	valorTotal: number,
): Promise<PagamentoPayloadNfe> {
	const dinheiro = parseValor(dav.dinheiro);
	const pix = parseValor(dav.pix);
	const cartao = parseValor(dav.posavista) + parseValor(dav.posaprazo);
	const outros = parseValor(dav.avista) + parseValor(dav.aprazo) + parseValor(dav.cheque);

	const pagamentoCampos = montarPagamentosPdvParaNfce(
		{
			valordinheiro: dinheiro > 0 ? String(dinheiro) : null,
			valorpix: pix > 0 ? String(pix) : null,
			valorcartao: cartao > 0 ? String(cartao) : null,
			valortotal: String(valorTotal),
		},
		valorTotal,
	);

	if (pagamentoCampos.formas.length > 0) {
		return pagamentoCampos;
	}

	if (dav.idtipodocumentofinanceiro) {
		const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
			dav.idtipodocumentofinanceiro,
		);
		const formapagamentonfe = tipoDoc?.formapagamentonfe?.trim();
		if (formapagamentonfe && valorTotal > 0) {
			const tPag = normalizarTPag(formapagamentonfe);
			const forma: PagamentoPayloadNfe["formas"][number] = {
				tPag,
				vPag: valorTotal,
			};
			if (exigeGrupoCard(tPag)) {
				return {
					formas: [
						complementarCardPagamentoNfe({
							...forma,
							card: montarCardPagamentoNfce(),
						}),
					],
				};
			}
			return { formas: [forma] };
		}
	}

	if (outros > 0) {
		return montarPagamentosPdvParaNfce(
			{
				valordinheiro: String(outros),
				valortotal: String(valorTotal),
			},
			valorTotal,
		);
	}

	return montarPagamentosPdvParaNfce({}, valorTotal);
}

export async function faturarDavNfceService({
	idusuario,
	iddav,
	idempresa,
	gerarFinanceiro = true,
	gerarEstoque = true,
}: FaturarDavNfceParametros): Promise<HttpResponse<ResultadoEmissaoNfcePdv>> {
	const dav = await buscarDavPorId(iddav);

	if (!dav) {
		return httpNaoEncontrado();
	}

	if (dav.idempresa !== idempresa) {
		return httpProibido();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (dav.status === 3) {
		return httpBadRequest("Pedido cancelado não pode emitir NFC-e");
	}

	if (dav.idnotafiscal) {
		return httpBadRequest("Pedido já faturado com NF-e");
	}

	if (dav.idnfce) {
		const notaExistente = await buscarNotaFiscalPorId(dav.idnfce);
		if (notaExistente?.status === NFE_STATUS.AUTORIZADA) {
			const resultadoExistente: ResultadoEmissaoNfcePdv = {
				emitida: true,
				idnotafiscal: notaExistente.id,
			};
			if (notaExistente.chavenfe) resultadoExistente.chave = notaExistente.chavenfe;
			if (notaExistente.protocolonfe) {
				resultadoExistente.protocolo = notaExistente.protocolonfe;
			}

			const xmlExistente = await obterXmlAutorizadoNotaFiscal(notaExistente.id);
			const qrExtraido = extrairQrCodeNfceXml(xmlExistente);
			if (qrExtraido.qrCode) resultadoExistente.qrCode = qrExtraido.qrCode;
			if (qrExtraido.urlChave) resultadoExistente.urlChave = qrExtraido.urlChave;

			return httpOk(resultadoExistente);
		}
	}

	const contexto = await carregarContextoEmissaoNfce(idempresa);
	if (contexto.pendencias.length > 0) {
		return httpOk({
			emitida: false,
			pendencias: contexto.pendencias,
		});
	}

	const { empresa, empresaFiscal, nfceConfiguracao, certificadoAtivo, seriePadrao } =
		contexto;
	if (!empresa || !empresaFiscal || !nfceConfiguracao || !certificadoAtivo) {
		return httpBadRequest("Contexto de emissão NFC-e incompleto");
	}

	const serieParaUsar =
		seriePadrao ?? (await buscarNfeSeriePadrao(idempresa, "65"));
	if (!serieParaUsar) {
		return httpOk({
			emitida: false,
			pendencias: [
				{
					codigo: "SERIE_NFCE_AUSENTE",
					mensagem: "Cadastre uma série padrão modelo 65 para NFC-e",
				},
			],
		});
	}

	const crt = empresaFiscal.crt ?? 3;
	const { itens: itensBrutos, pendencias: pendenciasItens } =
		await montarItensEmissaoDav(idempresa, iddav, { prioridadeNfce: true });

	if (itensBrutos.length === 0) {
		return httpBadRequest("Pedido sem itens válidos para emissão da NFC-e");
	}

	if (pendenciasItens.length > 0) {
		return httpOk({
			emitida: false,
			erro: pendenciasItens.join("; "),
		});
	}

	const reserva = await resolverNumeracaoEmissaoNfce(
		idempresa,
		dav.idnfce,
		serieParaUsar,
	);
	if (!reserva) {
		return httpBadRequest("Não foi possível reservar numeração da série NFC-e");
	}

	const itensEnriquecidos = await enriquecerItensEmissaoComProduto(itensBrutos);
	const itensTributacao = normalizarGtinItensEmissao(
		normalizarItensEmissaoNfe(crt, itensEnriquecidos),
	);
	const { itens: itensNormalizados, pendencias: pendenciasCreditoSn } =
		await aplicarCreditoIcmsSnItensEmissao(itensTributacao);

	if (pendenciasCreditoSn.length > 0) {
		return httpOk({
			emitida: false,
			erro: pendenciasCreditoSn.join("; "),
		});
	}

	const valorTotalItens = itensNormalizados.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const desconto = parseValor(dav.descontosubtotal ?? dav.desconto);
	const valorNota = Math.max(valorTotalItens - desconto, 0.01);

	const pagamentoBruto = await montarPagamentoDavParaNfce(dav, valorNota);
	const totaisFiscais = calcularTotaisFiscaisEmissaoNfe(crt, itensNormalizados, {
		...(desconto > 0 ? { desconto } : {}),
	});
	const pagamentoNormalizado = normalizarPagamentoEmissaoNfe(pagamentoBruto, {
		finNFe: 1,
		valorNota: totaisFiscais.totalNota,
	});

	const natOp = await resolverNatOpEmissaoNfe({
		idempresa,
		...(itensNormalizados[0]?.cfop
			? { cfopItem: itensNormalizados[0].cfop }
			: {}),
	});

	const destinatarioResolvido = await montarDestinatarioPorIdentidade(
		dav.idcliente,
	);
	const destinatario =
		destinatarioResolvido?.destinatario ??
		(dav.cnpjcpfcliente
			? {
					cnpjcpf: dav.cnpjcpfcliente,
					razaosocial: dav.nomecliente?.trim() || "CONSUMIDOR",
					indIEDest: 9 as const,
				}
			: undefined);

	const idnotafiscal = reserva.idnotafiscal;
	const ambiente = nfceConfiguracao.ambiente;

	const payload = montarPayloadGatewayEmissaoNfce({
		empresa,
		empresaFiscal,
		nfceConfiguracao,
		certificadoAtivo,
		numeroNf: reserva.numeroNf,
		serie: reserva.serie,
		itens: itensNormalizados,
		pagamento: pagamentoNormalizado,
		natOp,
		...(destinatario ? { destinatario } : {}),
		...(dav.observacao?.trim()
			? { informacoesAdicionais: dav.observacao.trim() }
			: {}),
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
		...(cStat ? { cStat } : {}),
		...(respostaGateway.protocolo ? { protocolo: respostaGateway.protocolo } : {}),
		...(erroTransmissao ? { erroTransmissao } : {}),
	});

	const agora = agoraBrasiliaIsoOffset();
	const dataEmissao = hojeBrasiliaIsoDate();
	const valortotalnota = totaisFiscais.totalNota.toFixed(2);

	const dadosNota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa,
		identidade: dav.idcliente ?? null,
		idplanocontas: null,
		idcondicaopagto: dav.idcondicaopagamento ?? null,
		idlocalestoque: dav.idlocalestoque ?? null,
		idtipodocumento: dav.idtipodocumentofinanceiro ?? null,
		idusuarioinclusao: idusuario,
		datainclusao: agora,
		emissao: dataEmissao,
		datahoraemissao: agora,
		currenttimemillis: Date.now(),
		modelo: "65",
		serie: reserva.serie,
		idserie: reserva.idserie,
		numeronotafiscal: String(reserva.numeroNf),
		chavenfe: respostaGateway.chave ?? null,
		protocolonfe: respostaGateway.protocolo ?? null,
		tipoambientenfe: ambiente,
		tipoorigem: 1,
		status: statusPersistido,
		razaosocial:
			destinatario?.razaosocial ?? dav.nomecliente ?? null,
		cnpjcpf: destinatario?.cnpjcpf ?? dav.cnpjcpfcliente ?? null,
		inscricaoestadual: destinatario?.ie ?? null,
		endereco: destinatario?.logradouro ?? null,
		numeroendereco: destinatario?.numero ?? null,
		bairro: destinatario?.bairro ?? null,
		cep: destinatario?.cep ?? null,
		cidade: destinatario?.cidade ?? null,
		estado: destinatario?.estado ?? null,
		valortotalnota,
		totalproduto: totaisFiscais.totalProdutos.toFixed(2),
		frete: null,
		seguro: null,
		descontosubtotal: desconto > 0 ? desconto.toFixed(2) : null,
		outrasdespesas: null,
		tipofrete: 9,
		baseicms: totaisFiscais.baseIcms.toFixed(2),
		icms: totaisFiscais.valorIcms.toFixed(2),
		ipi: null,
		pis: totaisFiscais.valorPis.toFixed(2),
		cofins: totaisFiscais.valorCofins.toFixed(2),
		baseicmssubstituicao: null,
		icmssubstituicao: null,
		arquivoxmlassinado: respostaGateway.xmlEnviado ?? null,
		arquivoxmlautorizada:
			statusPersistido === NFE_STATUS.AUTORIZADA
				? (respostaGateway.xmlRetorno ?? null)
				: null,
		mensagemtransmissaonfe: xMotivo,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
		codigostatustransmissaonfe: normalizarCodigoStatusNfe(cStatLote ?? cStat),
		observacao: dav.observacao ?? null,
		finalidadeemissaonfe: 1,
		chavedocumentoreferenciado: null,
		modelodocumentoreferenciado: null,
		seriedocumentoreferenciado: null,
		numerodocumentoreferenciado: null,
		datadocumentoreferenciado: null,
		tiponotadocumentoreferenciado: null,
		dadosimportacao: {
			origem: "dav-pos-nfce",
			iddav,
			natOp,
			pagamento: pagamentoNormalizado,
			emissao: {
				gerarFinanceiro,
				gerarEstoque,
			},
		},
	};

	const itensPersistencia = montarItensPersistencia(
		idnotafiscal,
		itensNormalizados,
	);

	if (reserva.reemissao) {
		await atualizarNotaFiscal(idnotafiscal, dadosNota);
		await substituirItensNotaFiscal(idnotafiscal, itensPersistencia);
	} else {
		await criarNotaFiscalComItens(dadosNota, itensPersistencia);
	}

	await atualizarDav(iddav, {
		idnfce: idnotafiscal,
		datahorafaturamento: agora,
		idusuariofaturamento: idusuario,
		status: statusPersistido === NFE_STATUS.AUTORIZADA ? 4 : dav.status,
	});

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

	if (statusPersistido === NFE_STATUS.AUTORIZADA) {
		await integrarNotaFiscalVendaAutorizadaService({
			idusuario,
			idnotafiscal,
			gerarFinanceiro,
			gerarEstoque,
		}).catch((erro) => {
			console.error("Erro na integração operacional da NFC-e do pedido:", erro);
		});
	}

	const emitida = statusPersistido === NFE_STATUS.AUTORIZADA;
	const resultado: ResultadoEmissaoNfcePdv = {
		emitida,
		idnotafiscal,
	};

	if (respostaGateway.chave) resultado.chave = respostaGateway.chave;
	if (respostaGateway.protocolo) resultado.protocolo = respostaGateway.protocolo;
	if (cStat) resultado.cStat = cStat;
	if (xMotivo) resultado.xMotivo = xMotivo;
	if (!emitida && !cStat && respostaGateway.erro) {
		resultado.erro = respostaGateway.erro;
	}

	const xmlQr =
		respostaGateway.xmlRetorno ??
		(statusPersistido === NFE_STATUS.AUTORIZADA
			? respostaGateway.xmlEnviado
			: undefined);
	const qrExtraido = extrairQrCodeNfceXml(xmlQr);
	if (qrExtraido.qrCode) resultado.qrCode = qrExtraido.qrCode;
	if (qrExtraido.urlChave) resultado.urlChave = qrExtraido.urlChave;

	return httpOk(resultado);
}
