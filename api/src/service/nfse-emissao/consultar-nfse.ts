import { MODELO_NFSE, TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { consultarNfsePorRpsGateway } from "@/lib/nfse-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { DadosEmissaoNfseSalvos } from "@/model/nfse-emissao-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
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

export type ResultadoConsultaNfse = {
	idnotafiscal: string;
	numeroNfse?: string | null;
	codigoVerificacao?: string | null;
	link?: string | null;
	status?: number;
	protocolo?: string | null;
	pendente?: boolean;
	modo?: string;
	integracao?: {
		parcelasGeradas: number;
		lancamentosCaixa: number;
		avisos: string[];
	};
};

type ConsultarNfseParametros = {
	idusuario: string;
	idnotafiscal: string;
};

function extrairDadosEmissao(dados: unknown): DadosEmissaoNfseSalvos | null {
	if (!dados || typeof dados !== "object") {
		return null;
	}
	return dados as DadosEmissaoNfseSalvos;
}

function extrairProtocoloDaMensagem(mensagem?: string | null): string | null {
	if (!mensagem) {
		return null;
	}
	const match = mensagem.match(/Protocolo:\s*([^\s.]+)/i);
	const protocolo = match?.[1]?.trim();
	return protocolo || null;
}

function mensagemIndicaDps(mensagem?: string | null): boolean {
	if (!mensagem) {
		return false;
	}
	return /dps|protocolo|ambiente nacional/i.test(mensagem);
}

/**
 * Decide se a consulta deve ir pelo caminho DPS pela nota emitida,
 * não apenas pela configuração atual da empresa.
 */
function resolverModoConsultaDps({
	emissaoSalva,
	protocolo,
	mensagem,
	configLayoutDps,
}: {
	emissaoSalva: DadosEmissaoNfseSalvos | null;
	protocolo: string | null;
	mensagem?: string | null;
	status?: number | null;
	configLayoutDps: boolean;
}): boolean {
	if (emissaoSalva?.modo === "dps") {
		return true;
	}
	if (emissaoSalva?.modo === "rps" || emissaoSalva?.modo === "rps-gerar") {
		return false;
	}
	if (protocolo || mensagemIndicaDps(mensagem)) {
		return true;
	}
	// Config DPS: emissão sem protocolo (ex.: falha SOAP) ainda é modo Nota Nacional.
	if (configLayoutDps) {
		return true;
	}
	return false;
}

export async function consultarNfseService({
	idusuario,
	idnotafiscal,
}: ConsultarNfseParametros): Promise<HttpResponse<ResultadoConsultaNfse>> {
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

	const credenciais = await montarCredenciaisGatewayNfse(nota.idempresa);
	if (!credenciais.ok) {
		return httpBadRequest(
			credenciais.pendencias.map((p) => p.mensagem).join("; "),
		);
	}

	const emissaoSalva = extrairDadosEmissao(nota.dadosimportacao);
	const protocoloMensagem = extrairProtocoloDaMensagem(
		nota.mensagemtransmissaonfe,
	);

	const protocoloCancelamento =
		emissaoSalva?.protocoloCancelamento?.trim() || null;
	const protocoloSubstituicao =
		emissaoSalva?.protocoloSubstituicao?.trim() || null;

	let tipoIntegracao:
		| "EMISSAO"
		| "CANCELAMENTO"
		| "CANCELAMENTO_POR_SUBSTITUICAO" = "EMISSAO";
	let protocolo =
		emissaoSalva?.protocolo?.trim() || protocoloMensagem || null;

	if (
		nota.status === NFE_STATUS.AUTORIZADA &&
		protocoloSubstituicao &&
		/substitui/i.test(nota.mensagemtransmissaonfe ?? "")
	) {
		tipoIntegracao = "CANCELAMENTO_POR_SUBSTITUICAO";
		protocolo = protocoloSubstituicao;
	} else if (
		nota.status === NFE_STATUS.AUTORIZADA &&
		protocoloCancelamento &&
		/cancelamento/i.test(nota.mensagemtransmissaonfe ?? "")
	) {
		tipoIntegracao = "CANCELAMENTO";
		protocolo = protocoloCancelamento;
	} else if (
		nota.status === NFE_STATUS.AUTORIZADA &&
		protocoloSubstituicao &&
		!protocoloCancelamento
	) {
		tipoIntegracao = "CANCELAMENTO_POR_SUBSTITUICAO";
		protocolo = protocoloSubstituicao;
	} else if (
		nota.status === NFE_STATUS.AUTORIZADA &&
		protocoloCancelamento
	) {
		tipoIntegracao = "CANCELAMENTO";
		protocolo = protocoloCancelamento;
	}

	const configLayoutDps = isLayoutNfseDps(
		credenciais.configJson.versaolayout as string | undefined,
	);
	const modoDps = resolverModoConsultaDps({
		emissaoSalva,
		protocolo,
		mensagem: nota.mensagemtransmissaonfe,
		status: nota.status,
		configLayoutDps,
	});

	if (modoDps && !protocolo) {
		if (nota.status === NFE_STATUS.REJEITADA) {
			return httpBadRequest(
				"A emissão DPS falhou antes de obter protocolo (ex.: erro de conexão SOAP). Emita novamente — não há status para consultar nesta nota.",
			);
		}

		return httpBadRequest(
			"Esta nota está em modo DPS, mas o protocolo não foi gravado. Emita novamente ou informe o protocolo no portal Betha.",
		);
	}

	const resposta = await consultarNfsePorRpsGateway({
		configJson: credenciais.configJson,
		pfxBase64: credenciais.pfxBase64,
		senha: credenciais.senha,
		dados: modoDps
			? {
					protocolo,
					tipoIntegracao,
					prestador: {
						cnpj: credenciais.empresa.cnpj.replace(/\D/g, ""),
						im:
							credenciais.empresaFiscal.inscricaomunicipal?.replace(
								/\D/g,
								"",
							) ?? "",
						municipioIbge:
							String(credenciais.configJson.codigomunicipioibge ?? "") ||
							undefined,
					},
				}
			: {
					rps: {
						numero: nota.numeronotafiscal ?? nota.numero,
						serie: nota.serie ?? "1",
						tipo: "1",
					},
					prestador: {
						cnpj: credenciais.empresa.cnpj.replace(/\D/g, ""),
						im:
							credenciais.empresaFiscal.inscricaomunicipal?.replace(
								/\D/g,
								"",
							) ?? "",
					},
				},
	});

	const consultaEvento =
		tipoIntegracao === "CANCELAMENTO" ||
		tipoIntegracao === "CANCELAMENTO_POR_SUBSTITUICAO";

	const pendente = consultaEvento
		? Boolean(resposta.pendente)
		: Boolean(resposta.pendente) && !resposta.numeroNfse;

	if (!resposta.sucesso && !pendente) {
		return httpBadRequest(
			resposta.erro ??
				resposta.erros?.map((e) => e.mensagem).join("; ") ??
				"Consulta NFS-e não retornou resultado",
		);
	}

	const precisaBackfillProtocolo =
		modoDps &&
		Boolean(protocolo) &&
		!emissaoSalva?.protocolo?.trim() &&
		tipoIntegracao === "EMISSAO";

	if (pendente) {
		if (precisaBackfillProtocolo) {
			await atualizarNotaFiscal(idnotafiscal, {
				dadosimportacao: {
					...(emissaoSalva ?? {}),
					protocolo,
					modo: "dps",
				} as unknown as Record<string, unknown>,
			});
		}

		return httpOk<ResultadoConsultaNfse>({
			idnotafiscal,
			protocolo: resposta.protocolo ?? protocolo,
			pendente: true,
			modo: modoDps ? "dps" : "rps",
			status: nota.status ?? NFE_STATUS.PENDENTE,
			numeroNfse: nota.numeronfse,
			codigoVerificacao: nota.codigoautenticidadenfse,
			link: nota.linknfse,
		});
	}

	if (consultaEvento && !pendente && resposta.sucesso) {
		const agora = new Date().toISOString();
		await atualizarNotaFiscal(idnotafiscal, {
			status: NFE_STATUS.CANCELADA,
			cancelamento: agora,
			mensagemtransmissaonfe: null,
			dadosimportacao: {
				...(emissaoSalva ?? {}),
				modo: "dps",
				...(tipoIntegracao === "CANCELAMENTO"
					? { protocoloCancelamento: protocolo }
					: { protocoloSubstituicao: protocolo }),
			} as unknown as Record<string, unknown>,
		});

		if (resposta.xmlEnviado || resposta.xml) {
			await arquivarXmlNotaFiscal({
				idempresa: nota.idempresa,
				idnotafiscal,
				tipo: "cancelado",
				xml: resposta.xml ?? resposta.xmlEnviado ?? "",
				chavenfe: montarIdentificadorXmlNfse(
					{
						codigoVerificacao: nota.codigoautenticidadenfse,
						numeroNfse: nota.numeronfse,
					},
					idnotafiscal,
				),
				protocolonfe: resposta.protocolo ?? protocolo ?? undefined,
			});
		}

		return httpOk<ResultadoConsultaNfse>({
			idnotafiscal,
			numeroNfse: nota.numeronfse,
			codigoVerificacao: nota.codigoautenticidadenfse,
			link: resposta.link ?? nota.linknfse,
			status: NFE_STATUS.CANCELADA,
			protocolo: resposta.protocolo ?? protocolo,
			pendente: false,
			modo: "dps",
		});
	}

	const estavaAutorizada = nota.status === NFE_STATUS.AUTORIZADA;
	const atualizacao: Partial<NovaNotaFiscal> = {};

	if (resposta.numeroNfse) {
		atualizacao.numeronfse = resposta.numeroNfse;
		atualizacao.status = NFE_STATUS.AUTORIZADA;
		atualizacao.pendenciarps = 0;
		atualizacao.mensagemtransmissaonfe = null;
	}
	if (resposta.codigoVerificacao) {
		atualizacao.codigoautenticidadenfse = resposta.codigoVerificacao;
	}
	if (resposta.link) {
		atualizacao.linknfse = resposta.link;
	}
	if (precisaBackfillProtocolo || (modoDps && protocolo)) {
		atualizacao.dadosimportacao = {
			...(emissaoSalva ?? {}),
			...(protocolo ? { protocolo } : {}),
			...(modoDps ? { modo: "dps" as const } : {}),
		} as unknown as Record<string, unknown>;
	}

	if (Object.keys(atualizacao).length > 0) {
		await atualizarNotaFiscal(idnotafiscal, atualizacao);
	}

	if (resposta.xmlEnviado || resposta.xml) {
		const numeroNfse = resposta.numeroNfse ?? nota.numeronfse;
		const codigoVerificacao =
			resposta.codigoVerificacao ?? nota.codigoautenticidadenfse;
		await arquivarXmlNotaFiscal({
			idempresa: nota.idempresa,
			idnotafiscal,
			tipo: numeroNfse ? "autorizado" : "assinado",
			xml: resposta.xml ?? resposta.xmlEnviado ?? "",
			chavenfe: montarIdentificadorXmlNfse(
				{ codigoVerificacao, numeroNfse },
				idnotafiscal,
			),
			protocolonfe: resposta.protocolo ?? protocolo ?? undefined,
		});
	}

	let integracao: ResultadoConsultaNfse["integracao"];
	const acabouDeAutorizar =
		Boolean(resposta.numeroNfse) && !estavaAutorizada;

	if (acabouDeAutorizar && (emissaoSalva?.gerarFinanceiro ?? true)) {
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

	return httpOk<ResultadoConsultaNfse>({
		idnotafiscal,
		numeroNfse: resposta.numeroNfse ?? nota.numeronfse,
		codigoVerificacao:
			resposta.codigoVerificacao ?? nota.codigoautenticidadenfse,
		link: resposta.link ?? nota.linknfse,
		status: resposta.numeroNfse
			? NFE_STATUS.AUTORIZADA
			: (nota.status ?? undefined),
		protocolo: resposta.protocolo ?? protocolo,
		pendente: false,
		modo: modoDps ? "dps" : "rps",
		integracao,
	});
}
