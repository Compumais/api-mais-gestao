import { consultarSituacaoChaveSefazGateway } from "@/lib/nfe-gateway-client.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorChaveNfe,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import { enfileirarEnvioDominioSilencioso } from "@/service/dominio/enfileirar-envio-dominio.js";
import type { ResultadoEmissaoNfcePdv } from "@/service/nfce-emissao/emitir-nfce-venda-pdv.js";
import { montarCredenciaisGatewayNfce } from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { classificarConsultaChaveNfce } from "@/util/conciliacao-nfce/classificar-resultado-transmissao-nfce.js";
import { compararDocumentoNfce } from "@/util/conciliacao-nfce/comparar-documento-nfce.js";
import { extrairChaveDuplicidadeNfce } from "@/util/conciliacao-nfce/extrair-chave-duplicidade-nfce.js";
import {
	extrairResumoXmlNfce,
	resumoDaChaveNfce,
} from "@/util/conciliacao-nfce/extrair-resumo-xml-nfce.js";
import {
	lerConciliacaoPersistida,
	lerRegistroImportacao,
	mesclarConciliacaoNfce,
} from "@/util/conciliacao-nfce/identidade-emissao-nfce.js";
import {
	logConciliacaoNfce,
	mensagemNfceAguardandoConsulta,
	mensagemNfceConflito,
	mensagemNfceRecuperada,
} from "@/util/conciliacao-nfce/mensagens-conciliacao-nfce.js";
import { resolverAcaoConciliacaoNfce } from "@/util/conciliacao-nfce/regras-conciliacao-nfce.js";
import type { ResumoDocumentoNfce } from "@/util/conciliacao-nfce/tipos-conciliacao-nfce.js";
import { resolverDataHoraAutorizacao } from "@/util/extrair-dh-recbto-xml.js";
import { extrairQrCodeNfceXml } from "@/util/extrair-qr-code-nfce-xml.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import { registrarTentativaEmissaoNfce } from "./registrar-tentativa-emissao-nfce.js";

export type ResultadoConciliacaoDocumentoNfce = {
	prosseguirTransmissao: boolean;
	resultado: ResultadoEmissaoNfcePdv;
};

function chave44(valor?: string | null): string | null {
	const digitos = valor?.replace(/\D/g, "") ?? "";
	return digitos.length === 44 ? digitos : null;
}

function numeroPositivo(valor: unknown): number | null {
	if (valor == null || String(valor).trim() === "") return null;
	const n = Number(String(valor).replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

function protocoloDeProtNFe(protNFe: unknown): string | undefined {
	if (!protNFe || typeof protNFe !== "object") return undefined;
	const rec = protNFe as Record<string, unknown>;
	const inf =
		rec.infProt && typeof rec.infProt === "object"
			? (rec.infProt as Record<string, unknown>)
			: rec;
	const nProt = inf.nProt;
	return nProt != null && String(nProt).trim() !== ""
		? String(nProt).trim()
		: undefined;
}

function dhRecbtoDeProtNFe(protNFe: unknown): string | null {
	if (!protNFe || typeof protNFe !== "object") return null;
	const rec = protNFe as Record<string, unknown>;
	const inf =
		rec.infProt && typeof rec.infProt === "object"
			? (rec.infProt as Record<string, unknown>)
			: rec;
	const dh = inf.dhRecbto;
	if (dh == null || String(dh).trim() === "") return null;
	const bruto = String(dh).trim();
	return Number.isFinite(Date.parse(bruto)) ? bruto : null;
}

function pagamentosLocais(
	dadosimportacao: unknown,
): ResumoDocumentoNfce["pagamentos"] {
	const pagamento = lerRegistroImportacao(dadosimportacao).pagamento;
	if (!pagamento || typeof pagamento !== "object") return [];
	const formas = (pagamento as { formas?: unknown }).formas;
	if (!Array.isArray(formas)) return [];
	return formas
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const forma = item as { tPag?: unknown; vPag?: unknown };
			const tPag = String(forma.tPag ?? "").trim();
			const vPag = numeroPositivo(forma.vPag);
			if (!tPag || vPag == null) return null;
			return { tPag, vPag };
		})
		.filter((item): item is { tPag: string; vPag: number } => item != null);
}

function resultadoBase(
	nota: NotaFiscal,
	parcial: ResultadoEmissaoNfcePdv,
): ResultadoEmissaoNfcePdv {
	const numero = Number(nota.numeronotafiscal);
	return {
		idnotafiscal: nota.id,
		...(nota.serie ? { serie: nota.serie } : {}),
		...(Number.isFinite(numero) && numero > 0 ? { numero } : {}),
		...(nota.chavenfe ? { chave: nota.chavenfe } : {}),
		...parcial,
	};
}

function resultadoAutorizado(
	nota: NotaFiscal,
	params: {
		chave: string;
		protocolo?: string;
		xml?: string;
		mensagem: string;
		recuperada: boolean;
	},
): ResultadoEmissaoNfcePdv {
	const qr = extrairQrCodeNfceXml(params.xml);
	return resultadoBase(nota, {
		emitida: true,
		chave: params.chave,
		...(params.protocolo ? { protocolo: params.protocolo } : {}),
		...(params.xml ? { xml: params.xml } : {}),
		...(qr.qrCode ? { qrCode: qr.qrCode } : {}),
		...(qr.urlChave ? { urlChave: qr.urlChave } : {}),
		cStat: "100",
		xMotivo: params.mensagem,
		situacao: params.recuperada ? "recuperada" : "autorizada",
		mensagemOperacional: params.mensagem,
		...(params.recuperada ? { recuperada: true } : {}),
	});
}

export async function conciliarNfceDocumento(params: {
	nota: NotaFiscal;
	idusuario?: string | null;
	motivoTentativa: string;
}): Promise<ResultadoConciliacaoDocumentoNfce> {
	const nota = params.nota;
	const conciliacao = lerConciliacaoPersistida(nota.dadosimportacao);
	const chaveLocal =
		chave44(nota.chavenfe) ?? chave44(conciliacao.chavePrevista);

	if (nota.status === NFE_STATUS.AUTORIZADA && chaveLocal) {
		const recuperada = conciliacao.recuperada === true;
		const mensagem = recuperada
			? mensagemNfceRecuperada({
					chave: chaveLocal,
					protocolo: nota.protocolonfe,
				})
			: (nota.mensagemtransmissaonfe ?? "NFC-e já autorizada.");
		return {
			prosseguirTransmissao: false,
			resultado: resultadoAutorizado(nota, {
				chave: chaveLocal,
				protocolo: nota.protocolonfe ?? undefined,
				mensagem,
				recuperada,
			}),
		};
	}

	const chaveDuplicidade = extrairChaveDuplicidadeNfce(
		nota.mensagemtransmissaonfe,
	);
	const cStatNota = nota.codigostatusprotocolonfe;
	const consultarDuplicidade =
		cStatNota === 539 ||
		(chaveDuplicidade != null && chaveDuplicidade !== chaveLocal);
	const chaveConsulta = consultarDuplicidade
		? (chaveDuplicidade ?? chaveLocal)
		: chaveLocal;

	if (!chaveConsulta) {
		const mensagem = mensagemNfceAguardandoConsulta();
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE_CONSULTA,
			mensagemtransmissaonfe: mensagem,
			dadosimportacao: mesclarConciliacaoNfce(nota.dadosimportacao, {
				tentativas: (conciliacao.tentativas ?? 0) + 1,
			}),
		});
		await registrarTentativaEmissaoNfce({
			idusuario: params.idusuario,
			idempresa: nota.idempresa,
			idnotafiscal: nota.id,
			tipo: "conciliacao",
			motivo: params.motivoTentativa,
			statusAnterior: nota.status,
			statusPosterior: NFE_STATUS.PENDENTE_CONSULTA,
			numero: nota.numeronotafiscal,
			serie: nota.serie,
			regra: "sem_chave_para_consulta",
		});
		return {
			prosseguirTransmissao: false,
			resultado: resultadoBase(nota, {
				emitida: false,
				situacao: "pendente_consulta",
				xMotivo: mensagem,
				erro: mensagem,
				mensagemOperacional: mensagem,
			}),
		};
	}

	await atualizarNotaFiscal(nota.id, {
		status: NFE_STATUS.RECUPERANDO,
		dadosimportacao: mesclarConciliacaoNfce(nota.dadosimportacao, {
			tentativas: (conciliacao.tentativas ?? 0) + 1,
		}),
	});

	const credenciais = await montarCredenciaisGatewayNfce(nota.idempresa);
	if (!credenciais.ok) {
		const mensagem = mensagemNfceAguardandoConsulta();
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE_CONSULTA,
			mensagemtransmissaonfe: mensagem,
		});
		return {
			prosseguirTransmissao: false,
			resultado: resultadoBase(nota, {
				emitida: false,
				situacao: "pendente_consulta",
				chave: chaveConsulta,
				xMotivo: mensagem,
				erro: mensagem,
				mensagemOperacional: mensagem,
			}),
		};
	}

	let cStatConsulta: string | undefined;
	let xMotivoConsulta: string | undefined;
	let xmlConsulta: string | undefined;
	let protNFe: unknown;
	try {
		const resposta = await consultarSituacaoChaveSefazGateway({
			configJson: credenciais.configJson,
			pfxBase64: credenciais.pfxBase64,
			senha: credenciais.senha,
			chaveNfe: chaveConsulta,
		});
		cStatConsulta = resposta.cStat;
		xMotivoConsulta = resposta.xMotivo;
		xmlConsulta = resposta.xml?.trim() || undefined;
		protNFe = resposta.protNFe;
		if (xmlConsulta) {
			await atualizarNotaFiscal(nota.id, {
				arquivoxmlconsultasituacao: xmlConsulta,
			});
		}
	} catch (erro) {
		const mensagem = mensagemNfceAguardandoConsulta();
		logConciliacaoNfce("falha_consulta", {
			idnotafiscal: nota.id,
			chave: chaveConsulta,
			mensagem: erro instanceof Error ? erro.message : "falha de consulta",
		});
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE_CONSULTA,
			mensagemtransmissaonfe: mensagem,
		});
		await registrarTentativaEmissaoNfce({
			idusuario: params.idusuario,
			idempresa: nota.idempresa,
			idnotafiscal: nota.id,
			tipo: "conciliacao",
			motivo: params.motivoTentativa,
			statusAnterior: nota.status,
			statusPosterior: NFE_STATUS.PENDENTE_CONSULTA,
			chave: chaveLocal,
			chaveRetornada: chaveConsulta,
			regra: "falha_consulta",
		});
		return {
			prosseguirTransmissao: false,
			resultado: resultadoBase(nota, {
				emitida: false,
				situacao: "pendente_consulta",
				chave: chaveConsulta,
				xMotivo: mensagem,
				erro: mensagem,
				mensagemOperacional: mensagem,
			}),
		};
	}

	const classe = classificarConsultaChaveNfce(cStatConsulta);
	const chaveConsultadaEhALocal = chaveConsulta === chaveLocal;
	const resumoSefaz =
		extrairResumoXmlNfce(xmlConsulta) ??
		({
			...resumoDaChaveNfce(chaveConsulta),
			cnpjEmitente: resumoDaChaveNfce(chaveConsulta).cnpjEmitente ?? null,
			modelo: resumoDaChaveNfce(chaveConsulta).modelo ?? null,
			serie: resumoDaChaveNfce(chaveConsulta).serie ?? null,
			numero: resumoDaChaveNfce(chaveConsulta).numero ?? null,
			tpEmis: resumoDaChaveNfce(chaveConsulta).tpEmis ?? null,
			chave: chaveConsulta,
			documentoDestinatario: null,
			valorTotal: null,
			quantidadeItens: null,
			quantidadeTotal: null,
			desconto: null,
			acrescimo: null,
			pagamentos: [],
		} satisfies ResumoDocumentoNfce);

	const itens = await listarItensPorNotaFiscal(nota.id);
	const quantidades = itens
		.map((item) => numeroPositivo(item.quantidade))
		.filter((item): item is number => item != null);
	const daChaveLocal = chaveLocal ? resumoDaChaveNfce(chaveLocal) : {};
	const resumoLocal: ResumoDocumentoNfce = {
		cnpjEmitente: daChaveLocal.cnpjEmitente ?? null,
		modelo: nota.modelo ?? daChaveLocal.modelo ?? null,
		serie: nota.serie ?? daChaveLocal.serie ?? null,
		numero: nota.numeronotafiscal ?? daChaveLocal.numero ?? null,
		tpEmis:
			daChaveLocal.tpEmis ??
			(conciliacao.tpEmis != null ? String(conciliacao.tpEmis) : null),
		chave: chaveLocal,
		documentoDestinatario: nota.cnpjcpf?.replace(/\D/g, "") || null,
		valorTotal: numeroPositivo(nota.valortotalnota),
		quantidadeItens: itens.length > 0 ? itens.length : null,
		quantidadeTotal:
			quantidades.length > 0
				? quantidades.reduce((acc, item) => acc + item, 0)
				: null,
		desconto: numeroPositivo(nota.descontosubtotal),
		acrescimo: numeroPositivo(nota.outrasdespesas),
		pagamentos: pagamentosLocais(nota.dadosimportacao),
	};
	const comparacao = compararDocumentoNfce(resumoLocal, resumoSefaz);
	const decisaoBruta = resolverAcaoConciliacaoNfce({
		classeConsulta: classe,
		chaveConsultadaEhALocal,
		comparacao,
	});
	const duplicidadeSemAlternativa =
		cStatNota === 539 &&
		(chaveDuplicidade == null || chaveDuplicidade === chaveLocal);
	const decisao =
		duplicidadeSemAlternativa && decisaoBruta.prosseguirTransmissao
			? {
					acao: "EXIGIR_INTERVENCAO" as const,
					regra: "539_sem_chave_alternativa",
					prosseguirTransmissao: false,
				}
			: decisaoBruta;

	logConciliacaoNfce("decisao", {
		idnotafiscal: nota.id,
		regra: decisao.regra,
		acao: decisao.acao,
		cStat: cStatConsulta ?? null,
		chaveLocal,
		chaveConsulta,
		equivalente: comparacao.equivalente,
	});

	if (decisao.acao === "AUTO_RECUPERAR") {
		const outraNota = await buscarNotaFiscalPorChaveNfe(
			nota.idempresa,
			chaveConsulta,
			nota.id,
		);
		if (outraNota) {
			return finalizarConflito({
				nota,
				idusuario: params.idusuario,
				motivoTentativa: params.motivoTentativa,
				chaveConsulta,
				resumoLocal,
				resumoSefaz,
				comparacao,
				regra: "chave_vinculada_a_outro_documento",
				cStat: cStatConsulta,
				xMotivo: xMotivoConsulta,
			});
		}

		const protocolo =
			protocoloDeProtNFe(protNFe) ?? nota.protocolonfe ?? undefined;
		const mensagem = mensagemNfceRecuperada({
			chave: chaveConsulta,
			protocolo,
		});
		const datahoraautorizacao =
			dhRecbtoDeProtNFe(protNFe) ??
			resolverDataHoraAutorizacao({
				xmlAutorizado: xmlConsulta,
				fallbackIso: new Date().toISOString(),
			});
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.AUTORIZADA,
			chavenfe: chaveConsulta,
			protocolonfe: protocolo ?? null,
			mensagemtransmissaonfe: mensagem,
			codigostatusprotocolonfe: 100,
			arquivoxmlautorizada: xmlConsulta ?? nota.arquivoxmlautorizada,
			datahoraautorizacao,
			dadosimportacao: mesclarConciliacaoNfce(nota.dadosimportacao, {
				recuperada: true,
				chaveSefaz: chaveConsulta,
				chavePrevista: chaveLocal ?? undefined,
			}),
		});
		if (xmlConsulta) {
			await arquivarXmlNotaFiscal({
				idnotafiscal: nota.id,
				idempresa: nota.idempresa,
				xml: xmlConsulta,
				chavenfe: chaveConsulta,
				protocolonfe: protocolo,
				tipo: "autorizado",
			}).catch((erro: unknown) => {
				logConciliacaoNfce("falha_arquivar_xml", {
					idnotafiscal: nota.id,
					mensagem: erro instanceof Error ? erro.message : "falha ao arquivar",
				});
			});
		}
		void enfileirarEnvioDominioSilencioso({
			idempresa: nota.idempresa,
			idnotafiscal: nota.id,
			tipo: "autorizada",
		});
		await registrarTentativaEmissaoNfce({
			idusuario: params.idusuario,
			idempresa: nota.idempresa,
			idnotafiscal: nota.id,
			tipo: "recuperacao",
			motivo: params.motivoTentativa,
			statusAnterior: nota.status,
			statusPosterior: NFE_STATUS.AUTORIZADA,
			numero: nota.numeronotafiscal,
			serie: nota.serie,
			chave: chaveLocal,
			chaveRetornada: chaveConsulta,
			protocolo,
			cStat: "100",
			xMotivo: xMotivoConsulta,
			regra: decisao.regra,
			tpEmis: numeroPositivo(resumoSefaz.tpEmis),
		});
		return {
			prosseguirTransmissao: false,
			resultado: resultadoAutorizado(
				{ ...nota, numeronotafiscal: nota.numeronotafiscal, serie: nota.serie },
				{
					chave: chaveConsulta,
					protocolo,
					xml: xmlConsulta,
					mensagem,
					recuperada: true,
				},
			),
		};
	}

	if (decisao.prosseguirTransmissao) {
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE,
			codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStatConsulta),
			mensagemtransmissaonfe:
				xMotivoConsulta ??
				"A SEFAZ não localizou esta NFC-e. A mesma chave será retransmitida.",
		});
		await registrarTentativaEmissaoNfce({
			idusuario: params.idusuario,
			idempresa: nota.idempresa,
			idnotafiscal: nota.id,
			tipo: "reenvio_mesma_chave",
			motivo: params.motivoTentativa,
			statusAnterior: nota.status,
			statusPosterior: NFE_STATUS.PENDENTE,
			chave: chaveConsulta,
			cStat: cStatConsulta,
			xMotivo: xMotivoConsulta,
			regra: decisao.regra,
			numero: nota.numeronotafiscal,
			serie: nota.serie,
		});
		return {
			prosseguirTransmissao: true,
			resultado: resultadoBase(nota, {
				emitida: false,
				situacao: "pendente_consulta",
				chave: chaveConsulta,
			}),
		};
	}

	if (decisao.acao === "EXIGIR_INTERVENCAO" || decisao.acao === "BLOQUEAR") {
		if (decisao.regra === "consulta_denegada" && chaveConsultadaEhALocal) {
			await atualizarNotaFiscal(nota.id, {
				status: NFE_STATUS.DENEGADA,
				codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStatConsulta),
				mensagemtransmissaonfe:
					xMotivoConsulta ??
					"NFC-e denegada na SEFAZ. A numeração não será reutilizada nesta tentativa.",
			});
			return {
				prosseguirTransmissao: false,
				resultado: resultadoBase(nota, {
					emitida: false,
					situacao: "rejeitada",
					cStat: cStatConsulta,
					xMotivo: xMotivoConsulta,
					erro: xMotivoConsulta,
					mensagemOperacional: xMotivoConsulta,
				}),
			};
		}
		return finalizarConflito({
			nota,
			idusuario: params.idusuario,
			motivoTentativa: params.motivoTentativa,
			chaveConsulta,
			resumoLocal,
			resumoSefaz,
			comparacao,
			regra: decisao.regra,
			cStat: cStatConsulta,
			xMotivo: xMotivoConsulta,
		});
	}

	const mensagem = mensagemNfceAguardandoConsulta();
	await atualizarNotaFiscal(nota.id, {
		status: NFE_STATUS.PENDENTE_CONSULTA,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStatConsulta),
		mensagemtransmissaonfe: mensagem,
	});
	await registrarTentativaEmissaoNfce({
		idusuario: params.idusuario,
		idempresa: nota.idempresa,
		idnotafiscal: nota.id,
		tipo: "conciliacao",
		motivo: params.motivoTentativa,
		statusAnterior: nota.status,
		statusPosterior: NFE_STATUS.PENDENTE_CONSULTA,
		chave: chaveLocal,
		chaveRetornada: chaveConsulta,
		cStat: cStatConsulta,
		xMotivo: xMotivoConsulta,
		regra: decisao.regra,
		numero: nota.numeronotafiscal,
		serie: nota.serie,
	});
	return {
		prosseguirTransmissao: false,
		resultado: resultadoBase(nota, {
			emitida: false,
			situacao: "pendente_consulta",
			chave: chaveConsulta,
			cStat: cStatConsulta,
			xMotivo: mensagem,
			erro: mensagem,
			mensagemOperacional: mensagem,
		}),
	};
}

async function finalizarConflito(params: {
	nota: NotaFiscal;
	idusuario?: string | null;
	motivoTentativa: string;
	chaveConsulta: string;
	resumoLocal: ResumoDocumentoNfce;
	resumoSefaz: ResumoDocumentoNfce;
	comparacao: ReturnType<typeof compararDocumentoNfce>;
	regra: string;
	cStat?: string;
	xMotivo?: string;
}): Promise<ResultadoConciliacaoDocumentoNfce> {
	const mensagem = mensagemNfceConflito({
		numero: params.resumoSefaz.numero ?? params.nota.numeronotafiscal,
		serie: params.resumoSefaz.serie ?? params.nota.serie,
		chave: params.chaveConsulta,
		valorLocal: params.resumoLocal.valorTotal,
		valorSefaz: params.resumoSefaz.valorTotal,
		divergencias: params.comparacao.divergencias,
	});
	await atualizarNotaFiscal(params.nota.id, {
		status: NFE_STATUS.CONFLITO,
		mensagemtransmissaonfe: mensagem,
		dadosimportacao: mesclarConciliacaoNfce(params.nota.dadosimportacao, {
			chaveSefaz: params.chaveConsulta,
			conflito: {
				regra: params.regra,
				valorLocal: params.resumoLocal.valorTotal,
				valorSefaz: params.resumoSefaz.valorTotal,
				divergencias: params.comparacao.divergencias,
			},
		}),
	});
	await registrarTentativaEmissaoNfce({
		idusuario: params.idusuario,
		idempresa: params.nota.idempresa,
		idnotafiscal: params.nota.id,
		tipo: "conflito",
		motivo: params.motivoTentativa,
		statusAnterior: params.nota.status,
		statusPosterior: NFE_STATUS.CONFLITO,
		numero: params.nota.numeronotafiscal,
		serie: params.nota.serie,
		chave: params.nota.chavenfe,
		chaveRetornada: params.chaveConsulta,
		cStat: params.cStat,
		xMotivo: params.xMotivo,
		regra: params.regra,
	});
	return {
		prosseguirTransmissao: false,
		resultado: resultadoBase(params.nota, {
			emitida: false,
			situacao: "conflito",
			xMotivo: mensagem,
			erro: mensagem,
			mensagemOperacional: mensagem,
			cStat: params.cStat,
		}),
	};
}
