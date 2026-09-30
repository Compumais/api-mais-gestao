import { v4 as uuidv4 } from "uuid";
import {
	emitirNfeGateway,
	formatarErroConexaoGateway,
} from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import {
	atualizarDav,
	buscarDavPorId,
} from "@/repositories/dav-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNfeSeriePadrao,
	buscarNfeSeriePorNumeroSerie,
	reservarProximoNumeroSerie,
} from "@/repositories/nfe-serie-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalNfcePorSerieNumero,
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { montarItensEmissaoDav } from "@/service/dav/montar-itens-emissao-dav.js";
import { enfileirarEnvioDominioSilencioso } from "@/service/dominio/enfileirar-envio-dominio.js";
import { conciliarNfceDocumento } from "@/service/nfce-emissao/conciliar-nfce-documento.js";
import {
	carregarContextoEmissaoNfce,
	montarPayloadGatewayEmissaoNfce,
} from "@/service/nfce-emissao/contexto-emissao-nfce.js";
import type { ResultadoEmissaoNfcePdv } from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { registrarTentativaEmissaoNfce } from "@/service/nfce-emissao/registrar-tentativa-emissao-nfce.js";
import { aplicarCreditoIcmsSnItensEmissao } from "@/service/nfe-emissao/aplicar-credito-icms-sn-itens.js";
import type { PagamentoPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { enriquecerItensEmissaoComProduto } from "@/service/nfe-emissao/enriquecer-itens-emissao-produto.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { integrarNotaFiscalVendaAutorizadaService } from "@/service/nota-fiscal/integrar-nota-fiscal-venda-autorizada.js";
import {
	isAmbienteHomologacao,
	resolverAmbienteSefaz,
} from "@/util/ambiente-sefaz.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import { camposTributariosItemEmissao } from "@/util/campos-tributarios-item-emissao.js";
import {
	complementarCardPagamentoNfe,
	exigeGrupoCard,
	montarCardPagamentoNfce,
	normalizarTPag,
} from "@/util/card-pagamento-nfce.js";
import { classificarResultadoTransmissaoNfce } from "@/util/conciliacao-nfce/classificar-resultado-transmissao-nfce.js";
import {
	lerConciliacaoPersistida,
	mesclarConciliacaoNfce,
	resolverIdentidadeEmissaoNfce,
} from "@/util/conciliacao-nfce/identidade-emissao-nfce.js";
import {
	mensagemConflitoNumeracao,
	mensagemNfceAguardandoConsulta,
} from "@/util/conciliacao-nfce/mensagens-conciliacao-nfce.js";
import { decidirProximaAcaoEmissaoNfce } from "@/util/conciliacao-nfce/regras-conciliacao-nfce.js";
import { montarDadosImportacaoItemEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";
import {
	agoraBrasiliaIsoOffset,
	agoraBrasiliaNaiveIso,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { resolverDataHoraAutorizacao } from "@/util/extrair-dh-recbto-xml.js";
import { extrairQrCodeNfceXml } from "@/util/extrair-qr-code-nfce-xml.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { validarIbsCbsItensEmissao } from "@/util/ibs-cbs-emissao-nfe.js";
import { obterCodigoUfIbge } from "@/util/montar-config-sped-nfe.js";
import { montarDestinatarioPorIdentidade } from "@/util/montar-destinatario-entidade-nfe.js";
import { montarPagamentosPdvParaNfce } from "@/util/montar-pagamentos-pdv-nfce.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarGtinItensEmissao } from "@/util/normalizar-gtin-item-emissao-nfe.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";
import { normalizarItensEmissaoNfe } from "@/util/normalizar-tributacao-item-emissao-nfe.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import { resolverNatOpEmissaoNfe } from "@/util/resolver-nat-op-emissao-nfe.js";
import {
	normalizarCodigoStatusNfe,
	normalizarCStatGateway,
} from "@/util/resolver-status-emissao-nfe.js";
import { validarCestItensEmissaoNfe } from "@/util/validar-cest-item-emissao-nfe.js";

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
				notaExistente.status === NFE_STATUS.PENDENTE ||
				notaExistente.status === NFE_STATUS.PENDENTE_CONSULTA ||
				notaExistente.status === NFE_STATUS.TRANSMITINDO ||
				notaExistente.status === NFE_STATUS.RECUPERANDO ||
				notaExistente.status === NFE_STATUS.CONFLITO) &&
			notaExistente.codigostatusprotocolonfe !== 206
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
					resolverAmbienteSefaz(notaExistente.tipoambientenfe),
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
		...camposTributariosItemEmissao(item),
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
	const outros =
		parseValor(dav.avista) + parseValor(dav.aprazo) + parseValor(dav.cheque);

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
			if (notaExistente.chavenfe)
				resultadoExistente.chave = notaExistente.chavenfe;
			if (notaExistente.protocolonfe) {
				resultadoExistente.protocolo = notaExistente.protocolonfe;
			}

			const xmlExistente = await obterXmlAutorizadoNotaFiscal(notaExistente.id);
			const qrExtraido = extrairQrCodeNfceXml(xmlExistente);
			if (qrExtraido.qrCode) resultadoExistente.qrCode = qrExtraido.qrCode;
			if (qrExtraido.urlChave)
				resultadoExistente.urlChave = qrExtraido.urlChave;

			return httpOk(resultadoExistente);
		}

		if (notaExistente && notaExistente.idempresa === idempresa) {
			const acao = decidirProximaAcaoEmissaoNfce(notaExistente);
			const chaveConhecida =
				(notaExistente.chavenfe?.replace(/\D/g, "").length ?? 0) === 44 ||
				Boolean(
					lerConciliacaoPersistida(notaExistente.dadosimportacao).chavePrevista,
				);
			if (acao === "bloquear") {
				return httpOk({
					emitida: false,
					idnotafiscal: notaExistente.id,
					situacao: "rejeitada",
					erro: "NFC-e cancelada ou inutilizada não pode ser transmitida novamente.",
					xMotivo:
						"NFC-e cancelada ou inutilizada não pode ser transmitida novamente.",
				});
			}
			if (
				acao === "conciliar" ||
				(acao === "transmitir_mesma_identidade" && chaveConhecida)
			) {
				const conciliacao = await conciliarNfceDocumento({
					nota: notaExistente,
					idusuario,
					motivoTentativa: "antes_de_transmitir_dav",
				});
				if (!conciliacao.prosseguirTransmissao) {
					return httpOk(conciliacao.resultado);
				}
			}
		}
	}

	const contexto = await carregarContextoEmissaoNfce(idempresa);
	if (contexto.pendencias.length > 0) {
		return httpOk({
			emitida: false,
			pendencias: contexto.pendencias,
		});
	}

	const {
		empresa,
		empresaFiscal,
		nfceConfiguracao,
		certificadoAtivo,
		seriePadrao,
	} = contexto;
	if (!empresa || !empresaFiscal || !nfceConfiguracao || !certificadoAtivo) {
		return httpBadRequest("Contexto de emissão NFC-e incompleto");
	}

	const serieParaUsar =
		seriePadrao ??
		(await buscarNfeSeriePadrao(
			idempresa,
			"65",
			resolverAmbienteSefaz(nfceConfiguracao.ambiente),
		));
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
		await montarItensEmissaoDav(idempresa, iddav, {
			prioridadeNfce: true,
			crt,
		});

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

	const pendenciasCest = validarCestItensEmissaoNfe(itensNormalizados);
	if (pendenciasCest.length > 0) {
		return httpOk({
			emitida: false,
			erro: pendenciasCest.join("; "),
		});
	}

	const pendenciasIbsCbs = validarIbsCbsItensEmissao(
		itensNormalizados,
		"nfce",
		crt,
	);
	if (pendenciasIbsCbs.length > 0) {
		return httpOk({
			emitida: false,
			erro: pendenciasIbsCbs.join("; "),
		});
	}

	const valorTotalItens = itensNormalizados.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const desconto = parseValor(dav.descontosubtotal ?? dav.desconto);
	const valorNota = Math.max(valorTotalItens - desconto, 0.01);

	const pagamentoBruto = await montarPagamentoDavParaNfce(dav, valorNota);
	const totaisFiscais = calcularTotaisFiscaisEmissaoNfe(
		crt,
		itensNormalizados,
		{
			...(desconto > 0 ? { desconto } : {}),
		},
	);
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
	const notaIdentidade = reserva.reemissao
		? await buscarNotaFiscalPorId(idnotafiscal)
		: null;
	const identidade = resolverIdentidadeEmissaoNfce({
		dhEmi: agoraBrasiliaIsoOffset(),
		cUF: obterCodigoUfIbge(empresaFiscal.uf ?? ""),
		cnpj: empresa.cnpj,
		serie: reserva.serie,
		numero: reserva.numeroNf,
		chaveAtual: notaIdentidade?.chavenfe,
		conciliacao: lerConciliacaoPersistida(notaIdentidade?.dadosimportacao),
		tpEmisPadrao: 1,
	});
	const notaOcupandoNumero = await buscarNotaFiscalNfcePorSerieNumero(
		idempresa,
		reserva.serie,
		reserva.numeroNf,
		ambiente,
	);
	if (notaOcupandoNumero && notaOcupandoNumero.id !== idnotafiscal) {
		const mensagem = mensagemConflitoNumeracao({
			numero: reserva.numeroNf,
			serie: reserva.serie,
		});
		return httpOk({
			emitida: false,
			idnotafiscal: notaOcupandoNumero.id,
			serie: reserva.serie,
			numero: reserva.numeroNf,
			situacao: "conflito",
			erro: mensagem,
			xMotivo: mensagem,
			mensagemOperacional: mensagem,
		});
	}
	const gerarFinanceiroResolvido = isAmbienteHomologacao(ambiente)
		? false
		: gerarFinanceiro;
	const gerarEstoqueResolvido = isAmbienteHomologacao(ambiente)
		? false
		: gerarEstoque;

	const payload = await montarPayloadGatewayEmissaoNfce({
		empresa,
		empresaFiscal,
		nfceConfiguracao,
		certificadoAtivo,
		numeroNf: reserva.numeroNf,
		serie: reserva.serie,
		itens: itensNormalizados,
		pagamento: pagamentoNormalizado,
		natOp,
		dhEmi: identidade.dhEmi,
		cNF: identidade.cNF,
		...(destinatario ? { destinatario } : {}),
		...(dav.observacao?.trim()
			? { informacoesAdicionais: dav.observacao.trim() }
			: {}),
	});

	const agoraTransmissao = agoraBrasiliaNaiveIso();
	const dadosTransmissao: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa,
		identidade: dav.idcliente ?? null,
		idplanocontas: null,
		idcondicaopagto: dav.idcondicaopagamento ?? null,
		idlocalestoque: dav.idlocalestoque ?? null,
		idtipodocumento: dav.idtipodocumentofinanceiro ?? null,
		idusuarioinclusao: idusuario,
		datainclusao: agoraTransmissao,
		emissao: hojeBrasiliaIsoDate(),
		datahoraemissao: agoraTransmissao,
		currenttimemillis: Date.now(),
		modelo: "65",
		serie: reserva.serie,
		idserie: reserva.idserie,
		numeronotafiscal: String(reserva.numeroNf),
		chavenfe: identidade.chavePrevista,
		protocolonfe: null,
		tipoambientenfe: ambiente,
		tipoorigem: 1,
		status: NFE_STATUS.TRANSMITINDO,
		razaosocial: destinatario?.razaosocial ?? dav.nomecliente ?? null,
		cnpjcpf: destinatario?.cnpjcpf ?? dav.cnpjcpfcliente ?? null,
		inscricaoestadual: destinatario?.ie ?? null,
		endereco: destinatario?.logradouro ?? null,
		numeroendereco: destinatario?.numero ?? null,
		bairro: destinatario?.bairro ?? null,
		cep: destinatario?.cep ?? null,
		cidade: destinatario?.cidade ?? null,
		estado: destinatario?.estado ?? null,
		valortotalnota: totaisFiscais.totalNota.toFixed(2),
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
		baseicmssubstituicao:
			totaisFiscais.baseIcmsSt > 0 ? totaisFiscais.baseIcmsSt.toFixed(2) : null,
		icmssubstituicao:
			totaisFiscais.valorIcmsSt > 0
				? totaisFiscais.valorIcmsSt.toFixed(2)
				: null,
		arquivoxmlassinado: null,
		arquivoxmlautorizada: null,
		datahoraautorizacao: null,
		mensagemtransmissaonfe: "Transmitindo NFC-e para a SEFAZ.",
		codigostatusprotocolonfe: null,
		codigostatustransmissaonfe: null,
		observacao: dav.observacao ?? null,
		finalidadeemissaonfe: 1,
		chavedocumentoreferenciado: null,
		modelodocumentoreferenciado: null,
		seriedocumentoreferenciado: null,
		numerodocumentoreferenciado: null,
		datadocumentoreferenciado: null,
		tiponotadocumentoreferenciado: null,
		dadosimportacao: mesclarConciliacaoNfce(
			{
				origem: "dav-pos-nfce",
				iddav,
				natOp,
				pagamento: pagamentoNormalizado,
				emissao: {
					gerarFinanceiro: gerarFinanceiroResolvido,
					gerarEstoque: gerarEstoqueResolvido,
				},
			},
			{
				cNF: identidade.cNF,
				tpEmis: identidade.tpEmis,
				dhEmi: identidade.dhEmi,
				...(identidade.chavePrevista
					? { chavePrevista: identidade.chavePrevista }
					: {}),
			},
		),
	};
	const itensTransmissao = montarItensPersistencia(
		idnotafiscal,
		itensNormalizados,
	);
	if (reserva.reemissao) {
		await atualizarNotaFiscal(idnotafiscal, dadosTransmissao);
		await substituirItensNotaFiscal(idnotafiscal, itensTransmissao);
	} else {
		await criarNotaFiscalComItens(dadosTransmissao, itensTransmissao);
	}
	await atualizarDav(iddav, {
		idnfce: idnotafiscal,
	});

	let respostaGateway: Awaited<ReturnType<typeof emitirNfeGateway>>;
	try {
		respostaGateway = await emitirNfeGateway(payload);
	} catch (erro) {
		const mensagem = mensagemNfceAguardandoConsulta();
		await atualizarNotaFiscal(idnotafiscal, {
			status: NFE_STATUS.PENDENTE_CONSULTA,
			mensagemtransmissaonfe: mensagem,
		});
		await registrarTentativaEmissaoNfce({
			idusuario,
			idempresa,
			idnotafiscal,
			tipo: "erro_comunicacao",
			motivo: "excecao_durante_transmissao_dav",
			statusAnterior: NFE_STATUS.TRANSMITINDO,
			statusPosterior: NFE_STATUS.PENDENTE_CONSULTA,
			numero: String(reserva.numeroNf),
			serie: reserva.serie,
			chave: identidade.chavePrevista,
			tpEmis: identidade.tpEmis,
			xMotivo: formatarErroConexaoGateway("", erro),
		});
		return httpOk({
			emitida: false,
			idnotafiscal,
			serie: reserva.serie,
			numero: reserva.numeroNf,
			chave: identidade.chavePrevista ?? undefined,
			situacao: "pendente_consulta",
			erro: mensagem,
			xMotivo: mensagem,
			mensagemOperacional: mensagem,
		});
	}

	const cStat = normalizarCStatGateway(respostaGateway.cStat);
	const cStatLote = normalizarCStatGateway(respostaGateway.cStatLote);
	const xMotivo =
		respostaGateway.xMotivo?.trim() ||
		(!respostaGateway.sucesso ? respostaGateway.erro?.trim() : undefined) ||
		null;
	const classeTransmissao = classificarResultadoTransmissaoNfce({
		cStat,
		protocolo: respostaGateway.protocolo,
		erro: respostaGateway.erro,
		xMotivo,
		sucesso: respostaGateway.sucesso,
	});
	const statusPersistido =
		classeTransmissao === "autorizada"
			? NFE_STATUS.AUTORIZADA
			: classeTransmissao === "desconhecida"
				? NFE_STATUS.PENDENTE_CONSULTA
				: classeTransmissao === "duplicidade"
					? NFE_STATUS.RECUPERANDO
					: NFE_STATUS.REJEITADA;
	const mensagemPersistida =
		classeTransmissao === "desconhecida"
			? mensagemNfceAguardandoConsulta()
			: xMotivo;

	const agora = agoraBrasiliaNaiveIso();
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
		razaosocial: destinatario?.razaosocial ?? dav.nomecliente ?? null,
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
		baseicmssubstituicao:
			totaisFiscais.baseIcmsSt > 0 ? totaisFiscais.baseIcmsSt.toFixed(2) : null,
		icmssubstituicao:
			totaisFiscais.valorIcmsSt > 0
				? totaisFiscais.valorIcmsSt.toFixed(2)
				: null,
		arquivoxmlassinado: respostaGateway.xmlEnviado ?? null,
		arquivoxmlautorizada:
			statusPersistido === NFE_STATUS.AUTORIZADA
				? (respostaGateway.xmlRetorno ?? null)
				: null,
		datahoraautorizacao:
			statusPersistido === NFE_STATUS.AUTORIZADA
				? resolverDataHoraAutorizacao({
						xmlAutorizado: respostaGateway.xmlRetorno,
						fallbackIso: agora,
					})
				: null,
		mensagemtransmissaonfe: mensagemPersistida,
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
		dadosimportacao: mesclarConciliacaoNfce(
			{
				origem: "dav-pos-nfce",
				iddav,
				natOp,
				pagamento: pagamentoNormalizado,
				emissao: {
					gerarFinanceiro: gerarFinanceiroResolvido,
					gerarEstoque: gerarEstoqueResolvido,
				},
			},
			{
				cNF: identidade.cNF,
				tpEmis: identidade.tpEmis,
				dhEmi: identidade.dhEmi,
				...(identidade.chavePrevista
					? { chavePrevista: identidade.chavePrevista }
					: {}),
			},
		),
	};

	const itensPersistencia = montarItensPersistencia(
		idnotafiscal,
		itensNormalizados,
	);

	await atualizarNotaFiscal(idnotafiscal, dadosNota);
	await substituirItensNotaFiscal(idnotafiscal, itensPersistencia);

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
			gerarFinanceiro: gerarFinanceiroResolvido,
			gerarEstoque: gerarEstoqueResolvido,
		}).catch((erro) => {
			console.error("Erro na integração operacional da NFC-e do pedido:", erro);
		});

		void enfileirarEnvioDominioSilencioso({
			idempresa,
			idnotafiscal,
			tipo: "autorizada",
		});
	}

	if (classeTransmissao === "duplicidade") {
		const notaDuplicada = await buscarNotaFiscalPorId(idnotafiscal);
		if (notaDuplicada) {
			const conciliacao = await conciliarNfceDocumento({
				nota: {
					...notaDuplicada,
					mensagemtransmissaonfe: xMotivo,
					codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
					chavenfe: respostaGateway.chave ?? notaDuplicada.chavenfe,
				},
				idusuario,
				motivoTentativa: "rejeicao_duplicidade_dav",
			});
			return httpOk(conciliacao.resultado);
		}
	}

	const emitida = statusPersistido === NFE_STATUS.AUTORIZADA;
	const resultado: ResultadoEmissaoNfcePdv = {
		emitida,
		idnotafiscal,
	};

	if (respostaGateway.chave) resultado.chave = respostaGateway.chave;
	if (respostaGateway.protocolo)
		resultado.protocolo = respostaGateway.protocolo;
	if (cStat) resultado.cStat = cStat;
	if (mensagemPersistida) resultado.xMotivo = mensagemPersistida;
	if (!emitida) {
		resultado.erro = mensagemPersistida ?? respostaGateway.erro;
		resultado.situacao =
			classeTransmissao === "desconhecida" ? "pendente_consulta" : "rejeitada";
		resultado.mensagemOperacional = mensagemPersistida ?? undefined;
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
