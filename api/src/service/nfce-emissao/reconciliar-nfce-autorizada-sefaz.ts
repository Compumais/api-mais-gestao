import { consultarSituacaoChaveSefazGateway } from "@/lib/nfe-gateway-client.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { atualizarNotaFiscal } from "@/repositories/nota-fiscal-repositories.js";
import { montarCredenciaisGatewayNfce } from "@/service/nfce-emissao/montar-credenciais-gateway-nfce.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import { extrairQrCodeNfceXml } from "@/util/extrair-qr-code-nfce-xml.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { obterXmlAutorizadoNotaFiscal } from "@/util/obter-xml-nota-fiscal.js";
import {
	cStatIndicaAutorizacao,
	normalizarCodigoStatusNfe,
} from "@/util/resolver-status-emissao-nfe.js";
import type { ResultadoEmissaoNfcePdv } from "./emitir-nfce-venda-pdv.js";

function extrairProtocoloProtNFe(protNFe: unknown): string | undefined {
	if (!protNFe || typeof protNFe !== "object") {
		return undefined;
	}

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

function montarResultadoAutorizado(
	nota: NotaFiscal,
	xml?: string,
	protocolo?: string,
): ResultadoEmissaoNfcePdv {
	const resultado: ResultadoEmissaoNfcePdv = {
		emitida: true,
		idnotafiscal: nota.id,
	};
	if (nota.chavenfe) resultado.chave = nota.chavenfe;
	if (protocolo ?? nota.protocolonfe) {
		resultado.protocolo = protocolo ?? nota.protocolonfe ?? undefined;
	}
	if (nota.serie) resultado.serie = nota.serie;
	const numero = Number(nota.numeronotafiscal);
	if (Number.isFinite(numero) && numero > 0) {
		resultado.numero = numero;
	}
	resultado.cStat = "100";
	if (xml) {
		resultado.xml = xml;
		const qr = extrairQrCodeNfceXml(xml);
		if (qr.qrCode) resultado.qrCode = qr.qrCode;
		if (qr.urlChave) resultado.urlChave = qr.urlChave;
	}
	return resultado;
}

export async function reconciliarNfceAutorizadaSefaz(
	nota: NotaFiscal,
): Promise<ResultadoEmissaoNfcePdv | null> {
	const chave = nota.chavenfe?.replace(/\D/g, "") ?? "";
	if (chave.length !== 44) {
		return null;
	}

	if (
		nota.status !== NFE_STATUS.PENDENTE &&
		nota.status !== NFE_STATUS.REJEITADA
	) {
		return null;
	}

	const credenciais = await montarCredenciaisGatewayNfce(nota.idempresa);
	if (!credenciais.ok) {
		return null;
	}

	try {
		const resposta = await consultarSituacaoChaveSefazGateway({
			configJson: credenciais.configJson,
			pfxBase64: credenciais.pfxBase64,
			senha: credenciais.senha,
			chaveNfe: chave,
		});

		if (!cStatIndicaAutorizacao(resposta.cStat)) {
			return null;
		}

		const protocolo =
			extrairProtocoloProtNFe(resposta.protNFe) ??
			nota.protocolonfe ??
			undefined;
		const xmlConsulta = resposta.xml?.trim() || undefined;
		const xmlAutorizado =
			xmlConsulta ?? (await obterXmlAutorizadoNotaFiscal(nota.id)) ?? undefined;

		await atualizarNotaFiscal(nota.id, {
			status: NFE_STATUS.AUTORIZADA,
			protocolonfe: protocolo ?? nota.protocolonfe,
			mensagemtransmissaonfe:
				resposta.xMotivo?.trim() || "Autorizado o uso da NF-e",
			codigostatusprotocolonfe: normalizarCodigoStatusNfe(resposta.cStat),
			arquivoxmlautorizada: xmlAutorizado ?? nota.arquivoxmlautorizada,
		});

		if (xmlAutorizado) {
			await arquivarXmlNotaFiscal({
				idnotafiscal: nota.id,
				idempresa: nota.idempresa,
				xml: xmlAutorizado,
				chavenfe: chave,
				protocolonfe: protocolo,
				tipo: "autorizado",
			}).catch(console.error);
		}

		return montarResultadoAutorizado(
			{
				...nota,
				status: NFE_STATUS.AUTORIZADA,
				protocolonfe: protocolo ?? nota.protocolonfe,
			},
			xmlAutorizado,
			protocolo,
		);
	} catch {
		return null;
	}
}
