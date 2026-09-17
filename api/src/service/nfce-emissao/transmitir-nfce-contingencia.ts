import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import {
	consultarSituacaoChaveSefazGateway,
	transmitirXmlNfceContingenciaGateway,
} from "@/lib/nfe-gateway-client.js";
import type { HttpResponse } from "@/model/http-model.js";
import type { NotaFiscal, NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalNfcePorSerieNumero,
	buscarNotaFiscalPorChaveNfe,
	buscarNotaFiscalPorId,
	registrarNotaFiscalContingenciaPdv,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	atualizarVendaPdvGourmet,
	buscarVendaPdvGourmetPorId,
	buscarVendaPdvGourmetPorNotaFiscalNfce,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { montarCredenciaisGatewayNfce } from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import { reconciliarNfceAutorizadaSefaz } from "@/service/nfce-emissao/reconciliar-nfce-autorizada-sefaz.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { numeroFiscalPreenchido } from "@/util/completar-listagem-nfce.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { decodificarChaveNfe } from "@/util/decodificar-chave-nfe.js";
import { httpBadRequest, httpCriacao, httpProibido } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { parseNFeXml } from "@/util/nfe-xml-parser.js";
import { normalizarCodigoStatusNfe } from "@/util/resolver-status-emissao-nfe.js";
import {
	formatarValorMonetario,
	parseValorMonetario,
} from "@/util/recebimentos-venda-util.js";

export type TransmitirNfceContingenciaParametros = {
	idusuario: string;
	idempresa: string;
	idvenda?: string;
	xml: string;
	chave?: string;
	serie: number;
	numero: number;
	motivo: string;
	datacontingencia: string;
};

export type TransmitirNfceContingenciaResultado = {
	idnotafiscal: string;
	status: string;
	transmitida: boolean;
	chave?: string;
	hashXml?: string;
	cStat?: string;
	motivo?: string;
	protocolo?: string;
	xmlAssinado?: string;
	xmlAutorizado?: string;
	revisaoManual?: boolean;
};

const CSTATS_TRANSITORIOS = new Set(["103", "104", "105", "108", "109"]);
const CSTATS_CHAVE_NAO_LOCALIZADA = new Set(["217"]);

function normalizarChave(chave?: string): string | undefined {
	const digits = (chave ?? "").replace(/\D/g, "");
	return digits.length === 44 ? digits : undefined;
}

function extrairValorTotalXml(xml: string): string | null {
	const m = xml.match(/<vNF>([0-9.]+)<\/vNF>/i);
	return m?.[1] ?? null;
}

function extrairNumeracaoXml(xml: string): { serie: number; numero: number } {
	const serieMatch = xml.match(/<serie>(\d+)<\/serie>/i);
	const numeroMatch = xml.match(/<nNF>(\d+)<\/nNF>/i);
	return {
		serie: Number(serieMatch?.[1] ?? 0),
		numero: Number(numeroMatch?.[1] ?? 0),
	};
}

function primeiroNumeroFiscal(
	...candidatos: Array<number | string | null | undefined>
): number | null {
	for (const candidato of candidatos) {
		if (numeroFiscalPreenchido(candidato)) {
			return Number(candidato);
		}
	}
	return null;
}

function resultadoExistente(
	idnotafiscal: string,
	statusNota: number | null | undefined,
	chave?: string | null,
	hashXml?: string,
): TransmitirNfceContingenciaResultado {
	const autorizada = statusNota === NFE_STATUS.AUTORIZADA;
	return {
		idnotafiscal,
		status: autorizada ? "autorizada" : "pendente_transmissao",
		transmitida: autorizada,
		...(chave ? { chave } : {}),
		...(hashXml ? { hashXml } : {}),
	};
}

function hashXml(xml: string): string {
	return createHash("sha256").update(xml, "utf8").digest("hex");
}

function dadosImportacaoNota(
	nota: Pick<NotaFiscal, "dadosimportacao">,
): Record<string, unknown> {
	return nota.dadosimportacao && typeof nota.dadosimportacao === "object"
		? (nota.dadosimportacao as Record<string, unknown>)
		: {};
}

function detectarPendenciasXmlLegado(xml: string): string[] {
	const obrigatorios = [
		"dhEmi",
		"dhCont",
		"enderEmit",
		"IE",
		"CRT",
		"det",
		"NCM",
		"CFOP",
		"imposto",
		"ICMSTot",
		"transp",
		"pag",
		"detPag",
	];
	return obrigatorios.filter(
		(tag) => !new RegExp(`<${tag}(?:\\s|>)`, "i").test(xml),
	);
}

function extrairProtocoloConsulta(protNFe: unknown): string | undefined {
	if (!protNFe || typeof protNFe !== "object") return undefined;
	const registro = protNFe as Record<string, unknown>;
	const inf =
		registro.infProt && typeof registro.infProt === "object"
			? (registro.infProt as Record<string, unknown>)
			: registro;
	const protocolo = String(inf.nProt ?? "").trim();
	return protocolo || undefined;
}

async function processarTransmissaoNota(
	nota: NotaFiscal,
	xml: string,
	hash: string,
): Promise<TransmitirNfceContingenciaResultado> {
	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return resultadoExistente(nota.id, nota.status, nota.chavenfe, hash);
	}

	const pendenciasLegado = detectarPendenciasXmlLegado(xml);
	if (pendenciasLegado.length > 0) {
		const motivo = `XML legado/incompleto requer revisão manual: ${pendenciasLegado.join(", ")}`;
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE,
			mensagemtransmissaonfe: motivo,
			dadosimportacao: {
				...dadosImportacaoNota(nota),
				xmlSha256: hash,
				revisaoManual: true,
				pendenciasXml: pendenciasLegado,
			},
		});
		return {
			idnotafiscal: nota.id,
			status: "revisao_manual",
			transmitida: false,
			chave: nota.chavenfe ?? undefined,
			hashXml: hash,
			motivo,
			revisaoManual: true,
		};
	}

	const credenciais = await montarCredenciaisGatewayNfce(nota.idempresa);
	if (!credenciais.ok) {
		const motivo = credenciais.pendencias.map((item) => item.mensagem).join("; ");
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE,
			mensagemtransmissaonfe: motivo,
		});
		return {
			idnotafiscal: nota.id,
			status: "pendente_transmissao",
			transmitida: false,
			chave: nota.chavenfe ?? undefined,
			hashXml: hash,
			motivo,
		};
	}

	const chave = normalizarChave(nota.chavenfe ?? undefined);
	if (!chave) {
		throw new Error("Nota de contingência persistida sem chave válida");
	}

	const consultaInicial = await consultarSituacaoChaveSefazGateway({
		...credenciais,
		chaveNfe: chave,
	});
	if (consultaInicial.cStat === "100") {
		const reconciliada = await reconciliarNfceAutorizadaSefaz(nota);
		return {
			idnotafiscal: nota.id,
			status: "autorizada",
			transmitida: true,
			chave,
			hashXml: hash,
			cStat: "100",
			motivo: consultaInicial.xMotivo,
			protocolo:
				extrairProtocoloConsulta(consultaInicial.protNFe) ??
				reconciliada?.protocolo,
			...(reconciliada?.xml ? { xmlAutorizado: reconciliada.xml } : {}),
		};
	}
	if (
		!consultaInicial.cStat ||
		(!CSTATS_CHAVE_NAO_LOCALIZADA.has(consultaInicial.cStat) &&
			!CSTATS_TRANSITORIOS.has(consultaInicial.cStat))
	) {
		const motivo =
			consultaInicial.xMotivo ??
			consultaInicial.erro ??
			"Consulta pré-envio inconclusiva";
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.PENDENTE,
			mensagemtransmissaonfe: motivo,
		});
		return {
			idnotafiscal: nota.id,
			status: "pendente_transmissao",
			transmitida: false,
			chave,
			hashXml: hash,
			...(consultaInicial.cStat ? { cStat: consultaInicial.cStat } : {}),
			motivo,
		};
	}
	if (CSTATS_TRANSITORIOS.has(consultaInicial.cStat)) {
		return {
			idnotafiscal: nota.id,
			status: "pendente_transmissao",
			transmitida: false,
			chave,
			hashXml: hash,
			cStat: consultaInicial.cStat,
			motivo: consultaInicial.xMotivo,
		};
	}

	const transmissao = await transmitirXmlNfceContingenciaGateway({
		...credenciais,
		xml,
		chave,
	});
	if (transmissao.cStat === "100") {
		const xmlAutorizado =
			transmissao.xmlAutorizado?.trim() || transmissao.xmlRetorno?.trim();
		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.AUTORIZADA,
			arquivoxmlassinado: transmissao.xmlAssinado ?? null,
			arquivoxmlautorizada: xmlAutorizado ?? null,
			protocolonfe: transmissao.protocolo ?? null,
			codigostatusprotocolonfe: 100,
			mensagemtransmissaonfe:
				transmissao.xMotivo ?? "Autorizado o uso da NFC-e",
			dadosimportacao: {
				...dadosImportacaoNota(nota),
				xmlSha256: hash,
				tpEmis: 9,
			},
		});
		if (xmlAutorizado) {
			await arquivarXmlNotaFiscal({
				idnotafiscal: nota.id,
				idempresa: nota.idempresa,
				xml: xmlAutorizado,
				chavenfe: chave,
				protocolonfe: transmissao.protocolo,
				tipo: "autorizado",
			}).catch(console.error);
		}
		return {
			idnotafiscal: nota.id,
			status: "autorizada",
			transmitida: true,
			chave,
			hashXml: hash,
			cStat: "100",
			motivo: transmissao.xMotivo,
			protocolo: transmissao.protocolo,
			xmlAssinado: transmissao.xmlAssinado,
			xmlAutorizado,
		};
	}

	if (!transmissao.cStat || transmissao.cStat === "204") {
		const reconciliada = await reconciliarNfceAutorizadaSefaz({
			...nota,
			arquivoxmlassinado:
				transmissao.xmlAssinado ?? nota.arquivoxmlassinado,
		});
		if (reconciliada) {
			return {
				idnotafiscal: nota.id,
				status: "autorizada",
				transmitida: true,
				chave,
				hashXml: hash,
				cStat: "100",
				protocolo: reconciliada.protocolo,
				xmlAssinado: transmissao.xmlAssinado,
				xmlAutorizado: reconciliada.xml,
			};
		}
	}

	const cStat = transmissao.cStat;
	const pendente = !cStat || CSTATS_TRANSITORIOS.has(cStat) || cStat === "204";
	const motivo =
		transmissao.xMotivo ??
		transmissao.erro ??
		(pendente ? "Transmissão inconclusiva" : "NFC-e rejeitada pela SEFAZ");
	await atualizarNotaFiscal(nota.id, {
		status: pendente ? NFE_STATUS.PENDENTE : NFE_STATUS.REJEITADA,
		arquivoxmlassinado:
			transmissao.xmlAssinado ?? nota.arquivoxmlassinado,
		mensagemtransmissaonfe: motivo,
		codigostatusprotocolonfe: normalizarCodigoStatusNfe(cStat),
		dadosimportacao: {
			...dadosImportacaoNota(nota),
			xmlSha256: hash,
			tpEmis: 9,
		},
	});
	return {
		idnotafiscal: nota.id,
		status: pendente ? "pendente_transmissao" : "rejeitada",
		transmitida: false,
		chave,
		hashXml: hash,
		...(cStat ? { cStat } : {}),
		motivo,
		xmlAssinado: transmissao.xmlAssinado,
	};
}

/**
 * Recebe XML de NFC-e emitida em contingência offline (tpEmis=9) pelo PDV híbrido,
 * persiste como pendente de transmissão à SEFAZ e arquiva o XML.
 * O XML pode chegar sem assinatura digital; a assinatura é feita na retaguarda/gateway.
 * Não cria outra nota se a chave ou a venda já tiverem NFC-e na retaguarda.
 */
export async function transmitirNfceContingenciaService({
	idusuario,
	idempresa,
	idvenda,
	xml,
	chave,
	serie,
	numero,
	motivo,
	datacontingencia,
}: TransmitirNfceContingenciaParametros): Promise<
	HttpResponse<TransmitirNfceContingenciaResultado | null>
> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) {
		return httpProibido();
	}

	if (!xml.trim()) {
		return httpBadRequest("XML de contingência obrigatório");
	}
	const hash = hashXml(xml);

	let dadosXml: ReturnType<typeof parseNFeXml>;
	try {
		dadosXml = parseNFeXml(xml);
	} catch {
		return httpBadRequest("XML de contingência inválido");
	}
	if (dadosXml.modelo !== "65") {
		return httpBadRequest("XML informado não é uma NFC-e modelo 65");
	}
	// O PDV híbrido envia XML de contingência ainda sem Signature; a assinatura
	// digital ocorre na retaguarda/gateway ao transmitir à SEFAZ.
	const chaveXml = normalizarChave(dadosXml.chavenfe);
	const chaveInformada = normalizarChave(chave);
	if (chaveInformada && chaveXml && chaveInformada !== chaveXml) {
		return httpBadRequest("Chave informada diverge da chave contida no XML");
	}
	const chaveNorm = chaveXml ?? chaveInformada;
	if (!chaveNorm) {
		return httpBadRequest("XML de contingência sem chave NFC-e válida");
	}
	const serieXml = numeroPositivoXml(dadosXml.serie);
	const numeroXml = numeroPositivoXml(
		dadosXml.numeronotafiscal ?? dadosXml.numero,
	);
	if ((serieXml && serieXml !== serie) || (numeroXml && numeroXml !== numero)) {
		return httpBadRequest("Série ou número informados divergem do XML");
	}
	const tpEmis = numeroTagXml(xml, "tpEmis");
	if (tpEmis !== 9) {
		return httpBadRequest("XML não foi emitido em contingência (tpEmis=9)");
	}
	const ambienteXml = numeroTagXml(xml, "tpAmb");
	if (ambienteXml !== 1 && ambienteXml !== 2) {
		return httpBadRequest("Ambiente da NFC-e inválido no XML");
	}
	const empresa = await buscarEmpresaPorId(idempresa);
	const cnpjEmpresa = (empresa?.cnpj ?? "").replace(/\D/g, "");
	const cnpjXml = (dadosXml.cnpjemissor ?? "").replace(/\D/g, "");
	if (!cnpjEmpresa || cnpjXml !== cnpjEmpresa) {
		return httpBadRequest("CNPJ emitente do XML diverge da empresa");
	}

	const venda = idvenda ? await buscarVendaPdvGourmetPorId(idvenda) : null;
	if (chaveNorm) {
		const existente = await buscarNotaFiscalPorChaveNfe(idempresa, chaveNorm);
		if (existente?.modelo === "65") {
			const vendaVinculada = await buscarVendaPdvGourmetPorNotaFiscalNfce(
				existente.id,
			);
			const dadosImportacao =
				existente.dadosimportacao &&
				typeof existente.dadosimportacao === "object"
					? (existente.dadosimportacao as Record<string, unknown>)
					: null;
			const idVendaOrigem =
				typeof dadosImportacao?.idvenda === "string"
					? dadosImportacao.idvenda
					: null;
			if (
				idvenda &&
				((vendaVinculada && vendaVinculada.id !== idvenda) ||
					(idVendaOrigem &&
						idVendaOrigem !== idvenda &&
						idVendaOrigem !== venda?.idvendalocal))
			) {
				return httpBadRequest("NFC-e já vinculada a outra venda");
			}
			if (venda?.idempresa === idempresa && !venda.idnotafiscalnfce) {
				await atualizarVendaPdvGourmet(venda.id, {
					idnotafiscalnfce: existente.id,
				});
			}
			const hashPersistido = dadosImportacaoNota(existente).xmlSha256;
			if (
				typeof hashPersistido === "string" &&
				hashPersistido !== hash
			) {
				return httpBadRequest(
					"Conflito de hash: a chave já foi registrada com outro XML",
					{ code: "NFCE_CONTINGENCIA_HASH_DIVERGENTE" },
				);
			}
			return httpCriacao(await processarTransmissaoNota(existente, xml, hash));
		}
	}

	if (venda?.idempresa === idempresa && venda.idnotafiscalnfce) {
		const notaVenda = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
		if (notaVenda) {
			if (
				normalizarChave(notaVenda.chavenfe ?? undefined) !== chaveNorm
			) {
				return httpBadRequest(
					"Venda já vinculada a NFC-e com identidade fiscal divergente",
				);
			}
			const hashPersistido = dadosImportacaoNota(notaVenda).xmlSha256;
			if (typeof hashPersistido === "string" && hashPersistido !== hash) {
				return httpBadRequest(
					"Conflito de hash: a venda já foi registrada com outro XML",
					{ code: "NFCE_CONTINGENCIA_HASH_DIVERGENTE" },
				);
			}
			return httpCriacao(await processarTransmissaoNota(notaVenda, xml, hash));
		}
	}

	const daChave = chaveNorm ? decodificarChaveNfe(chaveNorm) : null;
	const daXml = extrairNumeracaoXml(xml);
	const serieFinal = primeiroNumeroFiscal(serie, daChave?.serie, daXml.serie);
	const numeroFinal = primeiroNumeroFiscal(
		numero,
		daChave?.numero,
		daXml.numero,
	);
	if (serieFinal == null || numeroFinal == null) {
		return httpBadRequest("Série ou número da NFC-e de contingência inválidos");
	}

	const existentePorNumero = await buscarNotaFiscalNfcePorSerieNumero(
		idempresa,
		serieFinal,
		numeroFinal,
	);
	if (existentePorNumero?.modelo === "65") {
		const chaveExistente = normalizarChave(existentePorNumero.chavenfe ?? undefined);
		if (chaveExistente && chaveNorm && chaveExistente !== chaveNorm) {
			return httpBadRequest(
				`NFC-e série ${serieFinal} número ${numeroFinal} já utilizada (chave ${chaveExistente})`,
				{ code: "NFCE_NUMERO_JA_USADO" },
			);
		}
		if (chaveExistente && chaveNorm && chaveExistente === chaveNorm) {
			const hashPersistido =
				dadosImportacaoNota(existentePorNumero).xmlSha256;
			if (typeof hashPersistido === "string" && hashPersistido !== hash) {
				return httpBadRequest(
					"Conflito de hash: série/número já registrados com outro XML",
					{ code: "NFCE_CONTINGENCIA_HASH_DIVERGENTE" },
				);
			}
			return httpCriacao(
				await processarTransmissaoNota(existentePorNumero, xml, hash),
			);
		}
		if (!chaveNorm && chaveExistente) {
			return httpBadRequest(
				`NFC-e série ${serieFinal} número ${numeroFinal} já utilizada (chave ${chaveExistente})`,
				{ code: "NFCE_NUMERO_JA_USADO" },
			);
		}
	}

	const idnotafiscal = uuidv4();
	const [dataCont, horaCont] = splitDataHoraContingencia(datacontingencia);
	const agora = agoraBrasiliaIsoOffset();
	const valorXml = extrairValorTotalXml(xml);
	const valorVenda = parseValorMonetario(venda?.valortotal);
	const valortotalnota =
		valorXml ?? (valorVenda > 0 ? formatarValorMonetario(valorVenda) : null);

	const dadosNota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa,
		modelo: "65",
		serie: String(serieFinal),
		numeronotafiscal: String(numeroFinal),
		tipoambientenfe: ambienteXml,
		tipoorigem: 1,
		status: NFE_STATUS.PENDENTE,
		finalidadeemissaonfe: 1,
		tipofrete: 9,
		chavenfe: chaveNorm ?? null,
		arquivoxmlcontingencia: xml,
		arquivoxmlassinado: null,
		motivocontingencia: motivo.slice(0, 256),
		datacontingencia: dataCont,
		horacontingencia: horaCont,
		mensagemtransmissaonfe: "Aguardando transmissão SEFAZ (contingência PDV)",
		emissao: hojeBrasiliaIsoDate(),
		datahoraemissao: agora,
		datainclusao: agora,
		currenttimemillis: Date.now(),
		...(valortotalnota ? { valortotalnota } : {}),
		dadosimportacao: {
			origem: "pdv-hibrido-contingencia",
			idvenda: idvenda ?? null,
			tpEmis: 9,
			xmlSha256: hash,
		},
	};

	const notaCriada = await registrarNotaFiscalContingenciaPdv(
		dadosNota,
		idvenda,
		numeroFinal,
	);
	if (!notaCriada) {
		throw new Error("Não foi possível registrar a NFC-e de contingência");
	}

	if (chaveNorm) {
		await arquivarXmlNotaFiscal({
			idnotafiscal,
			idempresa,
			xml,
			chavenfe: chaveNorm,
			tipo: "assinado",
		}).catch(console.error);
	}

	return httpCriacao<TransmitirNfceContingenciaResultado>(
		await processarTransmissaoNota(notaCriada, xml, hash),
	);
}

function numeroPositivoXml(valor?: string | number): number | null {
	const numero = Number(valor);
	return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function numeroTagXml(xml: string, tag: string): number | null {
	const match = xml.match(new RegExp(`<${tag}>(\\d+)</${tag}>`, "i"));
	const numero = Number(match?.[1]);
	return Number.isInteger(numero) ? numero : null;
}

function splitDataHoraContingencia(value: string): [string, string] {
	const iso = value.includes("T") ? value : `${value}T00:00:00`;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		const hoje = hojeBrasiliaIsoDate();
		return [hoje, "00:00:00"];
	}
	const data = d.toISOString().slice(0, 10);
	const hora = d.toISOString().slice(11, 19);
	return [data, hora];
}
