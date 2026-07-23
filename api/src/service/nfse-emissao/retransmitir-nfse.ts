import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { emitirNfseGateway } from "@/lib/nfse-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type {
	DadosEmissaoNfseSalvos,
	PayloadNfse,
} from "@/model/nfse-emissao-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNfseSerie,
	buscarNfseSeriePadrao,
	buscarNfseSeriePorNumeroSerie,
	reservarProximoNumeroSerieNfse,
} from "@/repositories/nfse-serie-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
} from "@/repositories/nota-fiscal-repositories.js";
import { integrarNfseAutorizadaService } from "@/service/nfse-emissao/integrar-nfse-autorizada.js";
import { montarCredenciaisGatewayNfse } from "@/service/nfse-emissao/montar-credenciais-gateway-nfse.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { montarIdentificadorXmlNfse } from "@/util/identificador-xml-nfse.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { isLayoutNfseDps } from "@/util/validar-pre-requisitos-emissao-nfse.js";

export type ResultadoRetransmissaoNfse = {
	idnotafiscal: string;
	numeroRps?: number;
	serie?: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	protocolo?: string | null;
	status?: number;
	pendente?: boolean;
	ambiente?: number;
	erros?: Array<{ codigo: string; mensagem: string }>;
	integracao?: {
		parcelasGeradas: number;
		lancamentosCaixa: number;
		avisos: string[];
	};
};

type RetransmitirNfseParametros = {
	idusuario: string;
	idnotafiscal: string;
};

const STATUS_RETRANSMISSAO = new Set<number>([
	NFE_STATUS.PENDENTE,
	NFE_STATUS.REJEITADA,
]);

function extrairDadosEmissao(dados: unknown): DadosEmissaoNfseSalvos | null {
	if (!dados || typeof dados !== "object") {
		return null;
	}
	return dados as DadosEmissaoNfseSalvos;
}

function payloadNfseValido(payload: unknown): payload is PayloadNfse {
	if (!payload || typeof payload !== "object") {
		return false;
	}
	const p = payload as PayloadNfse;
	return Boolean(p.prestador && p.tomador && p.rps && p.servico);
}

function mensagemErroE050(mensagemBase: string): string {
	return (
		`${mensagemBase} ` +
		"O ID da DPS (série + nDPS) já foi usado na Betha/ADN — mesmo quando a nota aparece rejeitada. " +
		"Ajuste o próximo número da série NFS-e para o valor indicado no Fly (ex.: 8402) e retransmita novamente."
	);
}

function respostaIndicaE050(resposta: {
	erro?: string;
	erros?: Array<{ codigo: string; mensagem: string }>;
}): boolean {
	if (/E050/i.test(resposta.erro ?? "")) {
		return true;
	}
	return (resposta.erros ?? []).some(
		(e) =>
			e.codigo === "E050" ||
			/DPS já recepcionada|ID da DPS não pode ser reutilizado/i.test(
				e.mensagem,
			),
	);
}

/**
 * Reserva um nDPS novo. O ID da DPS inclui o número — reutilizar após
 * recepção na Betha gera E050 mesmo se a nota local estiver rejeitada.
 */
async function reservarNovoNumeroDps(params: {
	idempresa: string;
	serieNota: string;
	numeroUsadoAnteriormente: number;
}) {
	let serieRegistro =
		(await buscarNfseSeriePorNumeroSerie(
			params.idempresa,
			params.serieNota,
		)) ?? (await buscarNfseSeriePadrao(params.idempresa));

	if (!serieRegistro) {
		return null;
	}

	const minimoProximo = params.numeroUsadoAnteriormente + 1;
	if (serieRegistro.numeroproximo < minimoProximo) {
		serieRegistro =
			(await atualizarNfseSerie(serieRegistro.id, {
				numeroproximo: minimoProximo,
			})) ?? serieRegistro;
	}

	return reservarProximoNumeroSerieNfse(serieRegistro.id);
}

export async function retransmitirNfseService({
	idusuario,
	idnotafiscal,
}: RetransmitirNfseParametros): Promise<HttpResponse<ResultadoRetransmissaoNfse>> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpNaoEncontrado();
	}

	if (nota.modelo !== MODELO_NFSE || nota.tipoorigem !== TIPO_ORIGEM_NFSE) {
		return httpBadRequest("Nota informada não é NFS-e de serviço");
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return httpBadRequest("NFS-e já autorizada não pode ser retransmitida");
	}

	if (nota.status === NFE_STATUS.CANCELADA) {
		return httpBadRequest("NFS-e cancelada não pode ser retransmitida");
	}

	if (nota.status == null || !STATUS_RETRANSMISSAO.has(nota.status)) {
		return httpBadRequest(
			"Somente NFS-e pendentes ou rejeitadas podem ser retransmitidas",
		);
	}

	const emissaoSalva = extrairDadosEmissao(nota.dadosimportacao);
	if (!emissaoSalva || !payloadNfseValido(emissaoSalva.payload)) {
		return httpBadRequest(
			"Payload da emissão original não encontrado — use Editar/Duplicar para emitir novamente",
		);
	}

	const credenciais = await montarCredenciaisGatewayNfse(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; ") ||
				"Pré-requisitos fiscais incompletos para retransmitir NFS-e",
		);
	}

	const payloadOriginal = emissaoSalva.payload;
	const numeroAnterior = Number(
		payloadOriginal.rps.numero || nota.numeronotafiscal || 0,
	);
	const serieNota = String(
		payloadOriginal.rps.serie || nota.serie || "1",
	);

	const reserva = await reservarNovoNumeroDps({
		idempresa: nota.idempresa,
		serieNota,
		numeroUsadoAnteriormente: Number.isFinite(numeroAnterior)
			? numeroAnterior
			: 0,
	});

	if (!reserva) {
		return httpBadRequest(
			"Não foi possível reservar um novo número DPS/RPS para retransmissão. Cadastre/ajuste a série NFS-e.",
		);
	}

	const agora = new Date();
	const dataEmissao = agora.toISOString().slice(0, 10);
	const payloadNfse: PayloadNfse = {
		...payloadOriginal,
		rps: {
			...payloadOriginal.rps,
			numero: reserva.numeroRps,
			serie: reserva.serie,
			dataEmissao,
			competencia: payloadOriginal.rps.competencia || dataEmissao,
		},
	};

	const resposta = await emitirNfseGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		payloadNfse,
	});

	const autorizada =
		resposta.sucesso === true && Boolean(resposta.numeroNfse);
	const modoDps =
		resposta.modo === "dps" ||
		String(resposta.versaolayout ?? "").toLowerCase().includes("dps") ||
		isLayoutNfseDps(
			String(credenciais.configJson.versaolayout ?? ""),
		);
	const pendenteDps =
		resposta.sucesso === true &&
		!autorizada &&
		Boolean(resposta.protocolo);
	const status = autorizada
		? NFE_STATUS.AUTORIZADA
		: pendenteDps
			? NFE_STATUS.PENDENTE
			: NFE_STATUS.REJEITADA;

	const mensagemRejeicaoBruta =
		resposta.erro ??
		resposta.erros?.map((e) => e.mensagem).join("; ") ??
		"Emissão NFS-e rejeitada";
	const mensagemRejeicao = respostaIndicaE050(resposta)
		? mensagemErroE050(mensagemRejeicaoBruta)
		: mensagemRejeicaoBruta;

	const dadosImportacao: DadosEmissaoNfseSalvos = {
		...emissaoSalva,
		payload: payloadNfse,
		...(resposta.protocolo ? { protocolo: resposta.protocolo } : {}),
		...(modoDps || pendenteDps
			? { modo: "dps" as const }
			: resposta.modo === "rps-gerar"
				? { modo: "rps-gerar" as const }
				: { modo: "rps" as const }),
	};

	await atualizarNotaFiscal(idnotafiscal, {
		serie: reserva.serie,
		numero: String(reserva.numeroRps),
		numeronotafiscal: String(reserva.numeroRps),
		numeronfse: resposta.numeroNfse ?? null,
		codigoautenticidadenfse: resposta.codigoVerificacao ?? null,
		linknfse: resposta.link ?? null,
		pendenciarps: autorizada ? 0 : 1,
		status,
		dadosimportacao: dadosImportacao as unknown as Record<string, unknown>,
		mensagemtransmissaonfe: autorizada
			? null
			: pendenteDps
				? `DPS recebida. Protocolo: ${resposta.protocolo}. Aguardando processamento no ambiente nacional.`
				: mensagemRejeicao,
	});

	const identificadorXml = montarIdentificadorXmlNfse(resposta, idnotafiscal);

	if (resposta.xmlEnviado) {
		await arquivarXmlNotaFiscal({
			idempresa: nota.idempresa,
			idnotafiscal,
			tipo: "assinado",
			xml: resposta.xmlEnviado,
			chavenfe: identificadorXml,
			protocolonfe: resposta.protocolo ?? undefined,
		});
	}

	if (resposta.xml) {
		await arquivarXmlNotaFiscal({
			idempresa: nota.idempresa,
			idnotafiscal,
			tipo: autorizada ? "autorizado" : "assinado",
			xml: resposta.xml,
			chavenfe: resposta.xmlEnviado
				? `${identificadorXml}-retorno`
				: identificadorXml,
			protocolonfe: resposta.protocolo ?? undefined,
		});
	}

	let integracao: ResultadoRetransmissaoNfse["integracao"];
	if (autorizada && (emissaoSalva.gerarFinanceiro ?? true)) {
		const resultadoIntegracao = await integrarNfseAutorizadaService({
			idusuario,
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

	const ambiente =
		typeof credenciais.configJson.ambiente === "number"
			? credenciais.configJson.ambiente
			: Number(credenciais.configJson.ambiente ?? nota.tipoambientenfe ?? 2);

	return httpOk<ResultadoRetransmissaoNfse>({
		idnotafiscal,
		numeroRps: reserva.numeroRps,
		serie: reserva.serie,
		numeroNfse: resposta.numeroNfse,
		codigoVerificacao: resposta.codigoVerificacao,
		link: resposta.link,
		protocolo: resposta.protocolo,
		status,
		pendente: pendenteDps,
		ambiente,
		erros: resposta.erros,
		integracao,
	});
}
