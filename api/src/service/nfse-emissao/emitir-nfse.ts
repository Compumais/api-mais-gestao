import { v4 as uuidv4 } from "uuid";
import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { emitirNfseGateway } from "@/lib/nfse-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosEmissaoNfseSalvos,
	ItemPayloadNfse,
} from "@/model/nfse-emissao-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import {
	buscarFaturamentoFiscalPorModeloOrdemServico,
	criarOrdemServicoFaturamento,
} from "@/repositories/ordem-servico-faturamento-repositories.js";
import { buscarOrdemServicoPorIdEempresa } from "@/repositories/ordem-servico-repositories.js";
import { integrarNfseAutorizadaService } from "@/service/nfse-emissao/integrar-nfse-autorizada.js";
import {
	type PrepararPayloadEmissaoNfseParams,
	prepararPayloadEmissaoNfse,
} from "@/service/nfse-emissao/preparar-payload-emissao-nfse.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { montarIdentificadorXmlNfse } from "@/util/identificador-xml-nfse.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	formatarMensagemErroGatewayNfse,
	isLayoutNfseDps,
	isProvedorSefinNacional,
} from "@/util/validar-pre-requisitos-emissao-nfse.js";

export type EmitirNfseParametros = PrepararPayloadEmissaoNfseParams;

export type ResultadoEmissaoNfse = {
	idnotafiscal: string;
	numeroRps: number;
	serie: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	chaveAcesso?: string | null;
	idDps?: string | null;
	link?: string | null;
	protocolo?: string | null;
	status?: number;
	pendente?: boolean;
	ambiente?: number;
	mensagemErro?: string | null;
	alertas?: Array<{ codigo: string; mensagem: string }>;
	pendencias?: Array<{ codigo: string; mensagem: string }>;
	erros?: Array<{ codigo: string; mensagem: string }>;
	integracao?: {
		parcelasGeradas: number;
		lancamentosCaixa: number;
		avisos: string[];
	};
};

function montarItensPersistencia(
	idnotafiscal: string,
	itens: ItemPayloadNfse[] | undefined,
	servicoDescricao: string,
	valorTotal: number,
	itemLista: string,
): NovoNotaFiscalItem[] {
	if (itens && itens.length > 0) {
		return itens.map((item, index) => ({
			id: uuidv4(),
			idnotafiscal,
			descricao: item.descricao,
			quantidade: String(item.quantidade),
			precounitario: String(item.valorUnitario),
			total: String(item.quantidade * item.valorUnitario),
			contador: index + 1,
			tipo: "S",
			codigolistalc11603: item.codigoListaLc11603 ?? itemLista,
			currenttimemillis: Date.now(),
		}));
	}

	return [
		{
			id: uuidv4(),
			idnotafiscal,
			descricao: servicoDescricao,
			quantidade: "1",
			precounitario: String(valorTotal),
			total: String(valorTotal),
			contador: 1,
			tipo: "S",
			codigolistalc11603: itemLista,
			currenttimemillis: Date.now(),
		},
	];
}

export async function emitirNfseService(
	params: EmitirNfseParametros,
): Promise<HttpResponse<ResultadoEmissaoNfse>> {
	if (params.idordemservico) {
		const os = await buscarOrdemServicoPorIdEempresa(
			params.idordemservico,
			params.idempresa,
		);
		if (!os) {
			return httpBadRequest("Ordem de serviço de origem não encontrada");
		}
		const nfseExistente = await buscarFaturamentoFiscalPorModeloOrdemServico(
			params.idordemservico,
			params.idempresa,
			MODELO_NFSE,
		);
		if (nfseExistente?.idnotafiscal) {
			return httpBadRequest(
				`Já existe NFS-e vinculada a esta OS: ${nfseExistente.idnotafiscal}`,
			);
		}
	}

	const preparado = await prepararPayloadEmissaoNfse(params);

	if (!preparado.success || !preparado.body) {
		return preparado as HttpResponse<ResultadoEmissaoNfse>;
	}

	const {
		payloadGateway,
		numeroRps,
		serie,
		ambiente,
		valorTotal,
		destinatario,
		dadosSalvos,
	} = preparado.body;

	const resposta = await emitirNfseGateway(payloadGateway);
	const agora = new Date().toISOString();
	const idnotafiscal = uuidv4();

	const provedorConfig = String(payloadGateway.configJson.provedor ?? "");
	const chaveAcesso =
		(resposta.chaveAcesso ?? resposta.codigoVerificacao ?? "").replace(
			/\D/g,
			"",
		) || null;
	const chaveValida = Boolean(chaveAcesso && chaveAcesso.length === 50);
	const autorizada =
		resposta.sucesso === true && (Boolean(resposta.numeroNfse) || chaveValida);
	const modoDps =
		resposta.modo === "dps" ||
		String(resposta.versaolayout ?? "")
			.toLowerCase()
			.includes("dps") ||
		isLayoutNfseDps(
			String(payloadGateway.configJson.versaolayout ?? ""),
			provedorConfig,
		);
	const pendenteDps =
		(resposta.pendente === true && Boolean(resposta.idDps)) ||
		(resposta.sucesso === true && !autorizada && Boolean(resposta.protocolo));
	const status = autorizada
		? NFE_STATUS.AUTORIZADA
		: pendenteDps
			? NFE_STATUS.PENDENTE
			: NFE_STATUS.REJEITADA;

	const dadosImportacao: DadosEmissaoNfseSalvos = {
		...dadosSalvos,
		payload: payloadGateway.payloadNfse,
		...(resposta.protocolo ? { protocolo: resposta.protocolo } : {}),
		...(resposta.idDps ? { idDps: resposta.idDps } : {}),
		...(modoDps || pendenteDps
			? { modo: "dps" as const }
			: resposta.modo === "rps-gerar"
				? { modo: "rps-gerar" as const }
				: { modo: "rps" as const }),
	};

	const mensagemRejeicaoBruta = formatarMensagemErroGatewayNfse(
		resposta,
		"Emissão NFS-e rejeitada",
	);
	const indicaE050 =
		/E050/i.test(mensagemRejeicaoBruta) ||
		(resposta.erros ?? []).some((e) => e.codigo === "E050");
	const sefin = isProvedorSefinNacional(provedorConfig);
	const mensagemRejeicao = indicaE050
		? sefin
			? `${mensagemRejeicaoBruta} O ID da DPS (série+nDPS ${numeroRps}) já foi usado na Sefin Nacional. ` +
				"Em Configurações → NFS-e, avance o próximo número da série e emita/retransmita de novo (ou consulte a DPS pelo Id antes)."
			: `${mensagemRejeicaoBruta} O ID da DPS (série+nDPS ${numeroRps}) já foi usado na Betha/ADN. ` +
				"Em Configurações → NFS-e, ajuste o próximo número da série para o valor do Fly (ex.: 8402) e emita/retransmita de novo."
		: mensagemRejeicaoBruta;

	const detalhePendenteSefin = formatarMensagemErroGatewayNfse(resposta, "");
	const mensagemPendente = sefin
		? detalhePendenteSefin
			? `Emissão Sefin pendente de confirmação (${detalhePendenteSefin}). Id DPS: ${resposta.idDps}. Use Consultar antes de reemitir.`
			: `Emissão Sefin pendente de confirmação. Id DPS: ${resposta.idDps}. Use Consultar antes de reemitir.`
		: `DPS recebida. Protocolo: ${resposta.protocolo}. Aguardando processamento no ambiente nacional.`;

	const mensagemTransmissao = autorizada
		? null
		: pendenteDps
			? mensagemPendente
			: mensagemRejeicao;

	const nota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa: params.idempresa,
		idusuarioinclusao: params.idusuario,
		identidade: params.iddestinatario ?? null,
		modelo: MODELO_NFSE,
		tipoorigem: TIPO_ORIGEM_NFSE,
		serie,
		numero: String(numeroRps),
		numeronotafiscal: String(numeroRps),
		numeronfse: resposta.numeroNfse ?? null,
		codigoautenticidadenfse: chaveAcesso ?? resposta.codigoVerificacao ?? null,
		linknfse: resposta.link ?? null,
		pendenciarps: autorizada ? 0 : 1,
		status,
		tipoambientenfe: ambiente,
		emissao: agora,
		datahoraemissao: agora,
		datainclusao: agora,
		currenttimemillis: Date.now(),
		valortotalnota: String(valorTotal),
		baseiss: String(payloadGateway.payloadNfse.servico.valores.servicos),
		iss: String(payloadGateway.payloadNfse.servico.valores.iss ?? 0),
		cnpjcpf: destinatario?.cnpjCpf ?? null,
		razaosocial: destinatario?.razaoSocial ?? null,
		dadosimportacao: dadosImportacao as unknown as Record<string, unknown>,
		mensagemtransmissaonfe: mensagemTransmissao,
	};

	const itens = montarItensPersistencia(
		idnotafiscal,
		params.itens,
		params.servico.discriminacao,
		valorTotal,
		params.servico.itemListaServico,
	);

	await criarNotaFiscalComItens(nota, itens);
	if (params.idordemservico) {
		await criarOrdemServicoFaturamento({
			id: uuidv4(),
			idempresa: params.idempresa,
			idordemservico: params.idordemservico,
			idnotafiscal,
			datacriacao: agora,
			dataalteracao: agora,
		});
	}

	const identificadorXml = montarIdentificadorXmlNfse(resposta, idnotafiscal);

	// xmlEnviado = DPS/RPS enviado; xml = retorno SOAP/provedor
	if (resposta.xmlEnviado) {
		await arquivarXmlNotaFiscal({
			idempresa: params.idempresa,
			idnotafiscal,
			tipo: "assinado",
			xml: resposta.xmlEnviado,
			chavenfe: identificadorXml,
			protocolonfe: resposta.protocolo ?? undefined,
		});
	}

	if (resposta.xml) {
		await arquivarXmlNotaFiscal({
			idempresa: params.idempresa,
			idnotafiscal,
			tipo: autorizada ? "autorizado" : "assinado",
			xml: resposta.xml,
			chavenfe: resposta.xmlEnviado
				? `${identificadorXml}-retorno`
				: identificadorXml,
			protocolonfe: resposta.protocolo ?? undefined,
		});
	}

	let integracao: ResultadoEmissaoNfse["integracao"];
	if (autorizada && (dadosSalvos.gerarFinanceiro ?? true)) {
		const resultadoIntegracao = await integrarNfseAutorizadaService({
			idusuario: params.idusuario,
			idnotafiscal,
			gerarFinanceiro: true,
		});
		if (resultadoIntegracao.success && resultadoIntegracao.body) {
			integracao = {
				parcelasGeradas: resultadoIntegracao.body.parcelasGeradas,
				lancamentosCaixa: resultadoIntegracao.body.lancamentosCaixa,
				avisos: resultadoIntegracao.body.avisos,
			};
		}
	}

	return httpOk<ResultadoEmissaoNfse>({
		idnotafiscal,
		numeroRps,
		serie,
		numeroNfse: resposta.numeroNfse,
		codigoVerificacao: chaveAcesso ?? resposta.codigoVerificacao,
		chaveAcesso,
		idDps: resposta.idDps ?? null,
		link: resposta.link,
		protocolo: resposta.protocolo,
		status,
		pendente: pendenteDps,
		ambiente,
		mensagemErro: mensagemTransmissao,
		alertas: resposta.alertas,
		erros: resposta.erros,
		integracao,
	});
}
