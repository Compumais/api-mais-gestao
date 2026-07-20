import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarEntidadePorId,
	verificarUsuarioPertenceEmpresa,
} from "@/repositories/entidade-repositories.js";
import {
	buscarNfeSeriePorId,
	buscarNfeSeriePorNumeroSerie,
	reservarProximoNumeroSerie,
} from "@/repositories/nfe-serie-repositories.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import { aplicarCreditoIcmsSnItensEmissao } from "@/service/nfe-emissao/aplicar-credito-icms-sn-itens.js";
import {
	carregarContextoEmissaoNfe,
	type DestinatarioPayloadNfe,
	type DocumentoReferenciadoPayloadNfe,
	type ItemPayloadNfe,
	montarPayloadGatewayEmissaoItens,
	type PagamentoPayloadNfe,
	type TotaisPayloadNfe,
	type TransportePayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { enriquecerItensEmissaoComProduto } from "@/service/nfe-emissao/enriquecer-itens-emissao-produto.js";
import { resolverDocumentoReferenciadoEmissao } from "@/service/nfe-emissao/resolver-documento-referenciado-emissao.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import {
	emissaoRequerDocumentoReferenciado,
	FIN_NFE_DEVOLUCAO,
	FIN_NFE_NORMAL,
	resolverTipoDevolucaoEmissao,
	resolverTpNfDevolucao,
	type TipoDevolucaoNfe,
} from "@/util/cfop-devolucao-emissao-nfe.js";
import { extrairDadosEmissaoNfeSalvos } from "@/util/dados-emissao-nfe-nota.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarGtinItensEmissao } from "@/util/normalizar-gtin-item-emissao-nfe.js";
import {
	normalizarIeParaNfe,
	resolverIndIeDestNfe,
} from "@/util/normalizar-ie-nfe.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";
import { normalizarItensEmissaoNfe } from "@/util/normalizar-tributacao-item-emissao-nfe.js";
import { resolverIdeEmissaoNfe } from "@/util/resolver-ide-emissao-nfe.js";
import { resolverNatOpEmissaoNfe } from "@/util/resolver-nat-op-emissao-nfe.js";
import { validarCestItensEmissaoNfe } from "@/util/validar-cest-item-emissao-nfe.js";

export const AVISO_PREVIEW_DANFE =
	"*** PRÉ-VISUALIZAÇÃO - DOCUMENTO SEM VALOR FISCAL ***";

export type PrepararPayloadEmissaoNfeVendaParams = {
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
	iddavs?: string[];
	codigosPedidos?: number[];
	formasPagamento?: FormaPagamentoNfVenda[];
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
};

export type NumeracaoEmissaoPreparada = {
	numeroNf: number;
	serie: string;
	idserie: string;
	idnotafiscal: string;
	reemissao: boolean;
};

export type PayloadEmissaoNfeVendaPreparado = {
	pendencias?: Array<{ codigo: string; mensagem: string }>;
	numeracao: NumeracaoEmissaoPreparada;
	empresa: NonNullable<
		Awaited<ReturnType<typeof carregarContextoEmissaoNfe>>["empresa"]
	>;
	empresaFiscal: NonNullable<
		Awaited<ReturnType<typeof carregarContextoEmissaoNfe>>["empresaFiscal"]
	>;
	nfeConfiguracao: NonNullable<
		Awaited<ReturnType<typeof carregarContextoEmissaoNfe>>["nfeConfiguracao"]
	>;
	certificadoAtivo: NonNullable<
		Awaited<ReturnType<typeof carregarContextoEmissaoNfe>>["certificadoAtivo"]
	>;
	ambiente: number;
	destinatario?: DestinatarioPayloadNfe;
	identidade?: string;
	itensNormalizados: ItemPayloadNfe[];
	transporteAjustado?: TransportePayloadNfe;
	natOpResolvida: string;
	pagamentoNormalizado: PagamentoPayloadNfe;
	documentoReferenciado?: DocumentoReferenciadoPayloadNfe;
	finNFe: number;
	tpNF: number;
	tipoDevolucao?: TipoDevolucaoNfe | null;
	ideEmissao: ReturnType<typeof resolverIdeEmissaoNfe>;
	totaisFiscais: ReturnType<typeof calcularTotaisFiscaisEmissaoNfe>;
	vProd: number;
	vFrete: number;
	vDesc: number;
	payloadGateway: ReturnType<typeof montarPayloadGatewayEmissaoItens>;
	idplanocontasResolvido?: string;
	idcondicaopagtoResolvido?: string;
	idlocalestoqueResolvido?: string;
	idtipodocumentoResolvido?: string;
	formasPagamentoResolvidas?: FormaPagamentoNfVenda[];
	gerarFinanceiroResolvido?: boolean;
	gerarEstoqueResolvido?: boolean;
	iddavResolvido?: string;
	iddavsResolvidos?: string[];
	codigosPedidosResolvidos?: number[];
	informacoesAdicionais?: string;
	totais?: TotaisPayloadNfe;
};

type ResultadoPreparacaoComPendencias = {
	pendencias: Array<{ codigo: string; mensagem: string }>;
	idnotafiscal: "";
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

function anexarAvisoPreview(infoAdic?: string): string {
	const aviso = AVISO_PREVIEW_DANFE;
	const atual = infoAdic?.trim() ?? "";
	if (!atual) {
		return aviso;
	}
	if (atual.includes(aviso)) {
		return atual.slice(0, 2000);
	}
	return `${aviso}\n${atual}`.slice(0, 2000);
}

async function resolverNumeracaoEmissao({
	idempresa,
	idnotafiscal,
	idserienfe,
	seriePadrao,
	modo,
}: {
	idempresa: string;
	idnotafiscal?: string;
	idserienfe?: string;
	seriePadrao: Awaited<
		ReturnType<typeof carregarContextoEmissaoNfe>
	>["seriePadrao"];
	modo: "emitir" | "preview";
}): Promise<HttpResponse<NumeracaoEmissaoPreparada>> {
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
		if (!notaExistente.serie || !notaExistente.numeronotafiscal) {
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

	if (modo === "preview") {
		return httpOk({
			numeroNf: serieParaUsar.numeroproximo,
			serie: serieParaUsar.serie,
			idserie: serieParaUsar.id,
			idnotafiscal: "00000000-0000-0000-0000-000000000000",
			reemissao: false,
		});
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

export async function prepararPayloadEmissaoNfeVenda(
	params: PrepararPayloadEmissaoNfeVendaParams,
	opcoes: { modo: "emitir" | "preview" },
): Promise<
	HttpResponse<
		PayloadEmissaoNfeVendaPreparado | ResultadoPreparacaoComPendencias
	>
> {
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
		iddavs,
		codigosPedidos,
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
		return httpOk({
			idnotafiscal: "",
			pendencias: contexto.pendencias,
		});
	}

	const { empresa, empresaFiscal, nfeConfiguracao, certificadoAtivo } =
		contexto;
	if (!empresa || !empresaFiscal || !nfeConfiguracao || !certificadoAtivo) {
		return httpBadRequest(
			"Contexto de emissão incompleto. Verifique os pré-requisitos.",
		);
	}
	const ambiente = nfeConfiguracao.ambiente;

	if (opcoes.modo === "emitir" && ambiente === 1 && !confirmarProducao) {
		return httpBadRequest(
			"Emissão em produção requer confirmação explícita (confirmarProducao: true)",
		);
	}

	const numeracao = await resolverNumeracaoEmissao({
		idempresa,
		idnotafiscal: idnotafiscalReemissao,
		idserienfe,
		seriePadrao: contexto.seriePadrao,
		modo: opcoes.modo,
	});

	if (!numeracao.success || !numeracao.body) {
		return {
			success: false,
			status: numeracao.status,
			error:
				numeracao.success === false ? numeracao.error : "Falha na numeração",
			code: numeracao.success === false ? numeracao.code : "NUMERACAO",
		};
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
	let iddavsResolvidos = iddavs;
	let codigosPedidosResolvidos = codigosPedidos;

	let emissaoSalvaReemissao:
		| ReturnType<typeof extrairDadosEmissaoNfeSalvos>
		| undefined;

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
		iddavsResolvidos ??= emissaoSalvaReemissao?.iddavs;
		codigosPedidosResolvidos ??= emissaoSalvaReemissao?.codigosPedidos;
	}

	if (
		(!iddavsResolvidos || iddavsResolvidos.length === 0) &&
		iddavResolvido
	) {
		iddavsResolvidos = [iddavResolvido];
	}

	if (
		iddavsResolvidos &&
		iddavsResolvidos.length > 0 &&
		!iddavResolvido
	) {
		iddavResolvido = iddavsResolvidos[0];
	}

	const freteComercial = totais?.frete ?? 0;
	const transporteAjustado = ajustarTransporteComFrete(
		transporte,
		freteComercial,
	);

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
			tipoDevolucao:
				documentoReferenciadoInput.tipoDevolucao ?? tipoDevolucao ?? "compra",
			idnotafiscalReferenciada:
				documentoReferenciadoInput.idnotafiscalReferenciada,
			chaveNfe: documentoReferenciadoInput.chaveNfe,
			xml: documentoReferenciadoInput.xml,
		});

		if (!resolvido.success) {
			return {
				success: false,
				status: resolvido.status,
				error: resolvido.error,
				code: resolvido.code,
			};
		}

		documentoReferenciado = resolvido.body ?? undefined;
	} else if (idnotafiscalReemissao) {
		const notaExistenteRef = await buscarNotaFiscalPorId(idnotafiscalReemissao);
		const chavePersistida =
			notaExistenteRef?.chavedocumentoreferenciado?.replace(/\D/g, "");
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
	const itensTributacao = normalizarGtinItensEmissao(
		normalizarItensEmissaoNfe(crt, itensEnriquecidos),
	);
	const { itens: itensNormalizados, pendencias: pendenciasCreditoSn } =
		await aplicarCreditoIcmsSnItensEmissao(itensTributacao);

	if (pendenciasCreditoSn.length > 0) {
		return httpBadRequest(pendenciasCreditoSn.join("; "));
	}

	const pendenciasCest = validarCestItensEmissaoNfe(itensNormalizados);
	if (pendenciasCest.length > 0) {
		return httpBadRequest(pendenciasCest.join("; "));
	}

	const vProd = itens.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const vFrete = totais?.frete ?? 0;
	const vDesc = totais?.desconto ?? 0;
	const totaisFiscais = calcularTotaisFiscaisEmissaoNfe(
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
						vPag: totaisFiscais.totalNota,
						indPag: tipoDoc.aprazo === 1 ? 1 : 0,
					},
				],
			};
		}
	}

	const pagamentoNormalizado = normalizarPagamentoEmissaoNfe(
		pagamentoResolvido,
		{
			finNFe,
			valorNota: totaisFiscais.totalNota,
		},
	);

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

	const infoAdic =
		opcoes.modo === "preview"
			? anexarAvisoPreview(informacoesAdicionais)
			: informacoesAdicionais;

	const payloadGateway = montarPayloadGatewayEmissaoItens({
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
		informacoesAdicionais: infoAdic,
		finNFe,
		tpNF,
		documentosReferenciados: documentoReferenciado
			? [documentoReferenciado]
			: [],
		indPres: ideEmissao.indPres,
	});

	return httpOk({
		numeracao: {
			numeroNf,
			serie,
			idserie,
			idnotafiscal,
			reemissao,
		},
		empresa,
		empresaFiscal,
		nfeConfiguracao,
		certificadoAtivo,
		ambiente,
		destinatario,
		identidade,
		itensNormalizados,
		transporteAjustado,
		natOpResolvida,
		pagamentoNormalizado,
		documentoReferenciado,
		finNFe,
		tpNF,
		tipoDevolucao,
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
		informacoesAdicionais: infoAdic,
		totais,
	});
}
