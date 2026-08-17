import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
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
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { httpBadRequest, httpCriacao, httpProibido } from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

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

	const chaveNorm = normalizarChave(chave);
	if (chaveNorm) {
		const existente = await buscarNotaFiscalPorChaveNfe(idempresa, chaveNorm);
		if (existente?.modelo === "65") {
			return httpCriacao(
				resultadoExistente(
					existente.id,
					existente.status,
					existente.chavenfe ?? chaveNorm,
				),
			);
		}
	}

	if (idvenda) {
		const venda = await buscarVendaPdvGourmetPorId(idvenda);
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
	}

	const idnotafiscal = uuidv4();
	const [dataCont, horaCont] = splitDataHoraContingencia(datacontingencia);
	const agora = agoraBrasiliaIsoOffset();
	const valorXml = extrairValorTotalXml(xml);

	const dadosNota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa,
		modelo: "65",
		serie: String(serie),
		numeronotafiscal: String(numero),
		tipoambientenfe: 2,
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
		...(valorXml ? { valortotalnota: valorXml } : {}),
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
		String(serie),
		numero,
	);

	if (idvenda) {
		const venda = await buscarVendaPdvGourmetPorId(idvenda);
		if (venda?.idempresa === idempresa && !venda.idnotafiscalnfce) {
			await atualizarVendaPdvGourmet(idvenda, {
				idnotafiscalnfce: idnotafiscal,
			});
		}
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
