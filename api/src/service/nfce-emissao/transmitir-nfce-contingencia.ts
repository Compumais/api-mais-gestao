import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { avancarNumeroproximoSerieSeNecessario } from "@/repositories/nfe-serie-repositories.js";
import {
	buscarNotaFiscalPorChaveNfe,
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	atualizarVendaPdvGourmet,
	buscarVendaPdvGourmetPorId,
	buscarVendaPdvGourmetPorNotaFiscalNfce,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
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
};

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
): TransmitirNfceContingenciaResultado {
	const autorizada = statusNota === NFE_STATUS.AUTORIZADA;
	return {
		idnotafiscal,
		status: autorizada ? "autorizada" : "pendente_transmissao",
		transmitida: autorizada,
		...(chave ? { chave } : {}),
	};
}

/**
 * Recebe XML de NFC-e emitida em contingência offline (tpEmis=9) pelo PDV híbrido,
 * persiste como pendente de transmissão à SEFAZ e arquiva o XML.
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

	let dadosXml: ReturnType<typeof parseNFeXml>;
	try {
		dadosXml = parseNFeXml(xml);
	} catch {
		return httpBadRequest("XML de contingência inválido");
	}
	if (dadosXml.modelo !== "65") {
		return httpBadRequest("XML informado não é uma NFC-e modelo 65");
	}
	if (
		!/<(?:\w+:)?Signature[\s>]/i.test(xml) ||
		!/<(?:\w+:)?SignedInfo[\s>]/i.test(xml) ||
		!/<(?:\w+:)?DigestValue>[^<]+<\/(?:\w+:)?DigestValue>/i.test(xml)
	) {
		return httpBadRequest("XML de contingência sem assinatura digital");
	}
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
			return httpCriacao(
				resultadoExistente(
					existente.id,
					existente.status,
					existente.chavenfe ?? chaveNorm,
				),
			);
		}
	}

	if (venda?.idempresa === idempresa && venda.idnotafiscalnfce) {
		const notaVenda = await buscarNotaFiscalPorId(venda.idnotafiscalnfce);
		if (notaVenda) {
			return httpCriacao(
				resultadoExistente(
					notaVenda.id,
					notaVenda.status,
					notaVenda.chavenfe ?? chaveNorm,
				),
			);
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
		arquivoxmlassinado: xml,
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
		},
	};

	await criarNotaFiscalComItens(dadosNota, []);

	await avancarNumeroproximoSerieSeNecessario(
		idempresa,
		"65",
		String(serieFinal),
		numeroFinal,
	);

	if (idvenda && venda?.idempresa === idempresa && !venda.idnotafiscalnfce) {
		await atualizarVendaPdvGourmet(idvenda, {
			idnotafiscalnfce: idnotafiscal,
		});
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

	return httpCriacao<TransmitirNfceContingenciaResultado>({
		idnotafiscal,
		status: "pendente_transmissao",
		transmitida: false,
		...(chaveNorm ? { chave: chaveNorm } : {}),
	});
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
