import { v4 as uuidv4 } from "uuid";
import { emitirNfeGateway } from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNfeSeriePorId,
	buscarNfeSeriePorNumeroSerie,
	reservarProximoNumeroSerie,
} from "@/repositories/nfe-serie-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { buscarTerminalPdvAtivoPorNumero } from "@/repositories/terminal-pdv-repositories.js";
import {
	atualizarVendaPdvGourmet,
	buscarVendaPdvGourmetPorId,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import {
	carregarContextoEmissaoNfce,
	montarPayloadGatewayEmissaoNfce,
} from "@/service/nfce-emissao/contexto-emissao-nfce.js";
import { montarItensEmissaoPdv } from "@/service/nfce-emissao/montar-itens-emissao-pdv.js";
import { reconciliarNfceAutorizadaSefaz } from "@/service/nfce-emissao/reconciliar-nfce-autorizada-sefaz.js";
import { aplicarCreditoIcmsSnItensEmissao } from "@/service/nfe-emissao/aplicar-credito-icms-sn-itens.js";
import { enriquecerItensEmissaoComProduto } from "@/service/nfe-emissao/enriquecer-itens-emissao-produto.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import { montarDadosImportacaoItemEmissaoNfe } from "@/util/dados-emissao-nfe-nota.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { extrairQrCodeNfceXml } from "@/util/extrair-qr-code-nfce-xml.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { montarDestinatarioPorIdentidade } from "@/util/montar-destinatario-entidade-nfe.js";
import { montarPagamentosPdvParaNfce } from "@/util/montar-pagamentos-pdv-nfce.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarGtinItensEmissao } from "@/util/normalizar-gtin-item-emissao-nfe.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";
import { normalizarItensEmissaoNfe } from "@/util/normalizar-tributacao-item-emissao-nfe.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import type { PagamentosRegistro } from "@/util/pagamentos-pdv-util.js";
import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";
import { resolverNatOpEmissaoNfe } from "@/util/resolver-nat-op-emissao-nfe.js";
import {
	normalizarCodigoStatusNfe,
	normalizarCStatGateway,
	resolverStatusPersistenciaEmissao,
} from "@/util/resolver-status-emissao-nfe.js";
import { validarCestItensEmissaoNfe } from "@/util/validar-cest-item-emissao-nfe.js";

export type EmitirNfceVendaPdvParametros = {
	idusuario: string;
	idempresa: string;
	idvenda: string;
	pagamentos?: PagamentosRegistro;
};

export type ResultadoEmissaoNfcePdv = {
	emitida: boolean;
	idnotafiscal?: string;
	chave?: string;
	protocolo?: string;
	qrCode?: string;
	urlChave?: string;
	cStat?: string;
	xMotivo?: string;
	serie?: string;
	numero?: number;
	xml?: string;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
	erro?: string;
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
	idnotafiscalVenda: string | null | undefined,
	serieParaUsar: NonNullable<Awaited<ReturnType<typeof buscarNfeSeriePorId>>>,
): Promise<NumeracaoEmissaoNfce | null> {
	if (idnotafiscalVenda) {
		const notaExistente = await buscarNotaFiscalPorId(idnotafiscalVenda);

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

		if (
			notaExistente &&
			notaExistente.idempresa === idempresa &&
			notaExistente.status === NFE_STATUS.DENEGADA
		) {
			const reservaDenegada = await reservarProximoNumeroSerie(
				serieParaUsar.id,
			);
			if (!reservaDenegada) return null;

			return {
				idnotafiscal: notaExistente.id,
				numeroNf: reservaDenegada.numeroReservado,
				serie: reservaDenegada.serie,
				idserie: serieParaUsar.id,
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

export async function emitirNfceVendaPdvService({
	idusuario,
	idempresa,
	idvenda,
	pagamentos = {},
}: EmitirNfceVendaPdvParametros): Promise<
	HttpResponse<ResultadoEmissaoNfcePdv>
> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) return httpProibido();

	const venda = await buscarVendaPdvGourmetPorId(idvenda);
	if (!venda || venda.idempresa !== idempresa) {
		return httpNaoEncontrado();
	}

	if (venda.idnotafiscalnfce) {
		const notaExistente = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
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
			if (xmlExistente) resultadoExistente.xml = xmlExistente;
			if (notaExistente.serie) resultadoExistente.serie = notaExistente.serie;
			const numeroExistente = Number(notaExistente.numeronotafiscal);
			if (Number.isFinite(numeroExistente) && numeroExistente > 0) {
				resultadoExistente.numero = numeroExistente;
			}

			return httpOk(resultadoExistente);
		}

		if (
			notaExistente &&
			(notaExistente.status === NFE_STATUS.PENDENTE ||
				notaExistente.status === NFE_STATUS.REJEITADA)
		) {
			const reconciliada = await reconciliarNfceAutorizadaSefaz(notaExistente);
			if (reconciliada) {
				return httpOk(reconciliada);
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

	const { empresa, empresaFiscal, nfceConfiguracao, certificadoAtivo } =
		contexto;
	if (!empresa || !empresaFiscal || !nfceConfiguracao || !certificadoAtivo) {
		return httpBadRequest("Contexto de emissão NFC-e incompleto");
	}

	const terminal = await buscarTerminalPdvAtivoPorNumero(
		idempresa,
		venda.numeropdv,
	);
	if (!terminal) {
		return httpOk({
			emitida: false,
			pendencias: [
				{
					codigo: "TERMINAL_PDV_AUSENTE",
					mensagem: `Cadastre o PDV ${venda.numeropdv} no retaguarda com série NFC-e própria`,
				},
			],
		});
	}

	const serieParaUsar = await buscarNfeSeriePorId(terminal.idnfeserie);
	if (!serieParaUsar || serieParaUsar.modelo !== "65" || !serieParaUsar.ativo) {
		return httpOk({
			emitida: false,
			pendencias: [
				{
					codigo: "TERMINAL_PDV_AUSENTE",
					mensagem: `Série NFC-e do PDV ${venda.numeropdv} inválida ou inativa`,
				},
			],
		});
	}

	const crt = empresaFiscal.crt ?? 3;
	const { itens: itensBrutos, pendencias: pendenciasItens } =
		await montarItensEmissaoPdv(idvenda, crt);

	if (itensBrutos.length === 0) {
		return httpBadRequest("A venda PDV não possui itens para emissão da NFC-e");
	}

	if (pendenciasItens.length > 0) {
		return httpOk({
			emitida: false,
			erro: pendenciasItens.join("; "),
		});
	}

	const reserva = await resolverNumeracaoEmissaoNfce(
		idempresa,
		venda.idnotafiscalnfce,
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

	const valorTotalVenda = Number.parseFloat(venda.valortotal ?? "0");
	const pagamentoBruto = montarPagamentosPdvParaNfce(
		pagamentos.valortotal
			? pagamentos
			: {
					valordinheiro: venda.valordinheiro,
					valorcartao: venda.valorcartao,
					valorcartaocredito: venda.valorcartaocredito,
					valorcartaodebito: venda.valorcartaodebito,
					valorpix: venda.valorpix,
					valorprepago: venda.valorprepago,
					valortroco: venda.valortroco,
					valortotal: venda.valortotal,
				},
		valorTotalVenda,
	);

	const desconto = parseValorMonetario(pagamentos.desconto);
	const totaisFiscais = calcularTotaisFiscaisEmissaoNfe(
		crt,
		itensNormalizados,
		desconto > 0 ? { desconto } : {},
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
		venda.identidade,
	);

	const idnotafiscal = reserva.idnotafiscal;
	const ambiente = nfceConfiguracao.ambiente;

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
		...(desconto > 0 ? { totais: { desconto } } : {}),
		...(destinatarioResolvido?.destinatario
			? { destinatario: destinatarioResolvido.destinatario }
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
		...(respostaGateway.protocolo
			? { protocolo: respostaGateway.protocolo }
			: {}),
		...(erroTransmissao ? { erroTransmissao } : {}),
	});

	const agora = agoraBrasiliaIsoOffset();
	const dataEmissao = hojeBrasiliaIsoDate();
	const valortotalnota = totaisFiscais.totalNota.toFixed(2);

	const dadosNota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa,
		identidade: destinatarioResolvido?.identidade ?? venda.identidade ?? null,
		idplanocontas: null,
		idcondicaopagto: null,
		idlocalestoque: null,
		idtipodocumento: null,
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
		razaosocial: destinatarioResolvido?.destinatario?.razaosocial ?? null,
		cnpjcpf: destinatarioResolvido?.destinatario?.cnpjcpf ?? null,
		inscricaoestadual: destinatarioResolvido?.destinatario?.ie ?? null,
		endereco: destinatarioResolvido?.destinatario?.logradouro ?? null,
		numeroendereco: destinatarioResolvido?.destinatario?.numero ?? null,
		bairro: destinatarioResolvido?.destinatario?.bairro ?? null,
		cep: destinatarioResolvido?.destinatario?.cep ?? null,
		cidade: destinatarioResolvido?.destinatario?.cidade ?? null,
		estado: destinatarioResolvido?.destinatario?.estado ?? null,
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
		observacao: null,
		finalidadeemissaonfe: 1,
		chavedocumentoreferenciado: null,
		modelodocumentoreferenciado: null,
		seriedocumentoreferenciado: null,
		numerodocumentoreferenciado: null,
		datadocumentoreferenciado: null,
		tiponotadocumentoreferenciado: null,
		dadosimportacao: {
			origem: "pdv-gourmet",
			idvenda,
			natOp,
			pagamento: pagamentoNormalizado,
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

	await atualizarVendaPdvGourmet(idvenda, {
		idnotafiscalnfce: idnotafiscal,
		deveemitirnfce: true,
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

	const emitida = statusPersistido === NFE_STATUS.AUTORIZADA;
	const resultado: ResultadoEmissaoNfcePdv = {
		emitida,
		idnotafiscal,
	};

	if (respostaGateway.chave) resultado.chave = respostaGateway.chave;
	if (respostaGateway.protocolo)
		resultado.protocolo = respostaGateway.protocolo;
	if (cStat) resultado.cStat = cStat;
	if (xMotivo) resultado.xMotivo = xMotivo;
	resultado.serie = reserva.serie;
	resultado.numero = reserva.numeroNf;
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
	const xmlCliente = emitida
		? (xmlQr ?? respostaGateway.xmlEnviado)
		: (respostaGateway.xmlEnviado ?? xmlQr);
	if (xmlCliente) resultado.xml = xmlCliente;

	return httpOk(resultado);
}
