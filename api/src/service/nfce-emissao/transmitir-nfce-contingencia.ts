import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { criarNotaFiscalComItens } from "@/repositories/nota-fiscal-repositories.js";
import { arquivarXmlNotaFiscal } from "@/service/nota-fiscal/arquivar-xml-nota-fiscal.js";
import {
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import {
	httpCriacao,
	httpProibido,
	httpBadRequest,
} from "@/util/http-util.js";

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

/**
 * Recebe XML de NFC-e emitida em contingência offline (tpEmis=9) pelo PDV híbrido,
 * persiste como pendente de transmissão à SEFAZ e arquiva o XML.
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

	const idnotafiscal = uuidv4();
	const [dataCont, horaCont] = splitDataHoraContingencia(datacontingencia);

	const dadosNota: NovaNotaFiscal = {
		id: idnotafiscal,
		idempresa,
		modelo: "65",
		serie: String(serie),
		numero: String(numero),
		tipoambientenfe: 2,
		tipoorigem: 1,
		status: NFE_STATUS.PENDENTE,
		finalidadeemissaonfe: 1,
		tipofrete: 9,
		chavenfe: chave ?? null,
		arquivoxmlcontingencia: xml,
		arquivoxmlassinado: xml,
		motivocontingencia: motivo.slice(0, 256),
		datacontingencia: dataCont,
		horacontingencia: horaCont,
		mensagemtransmissaonfe: "Aguardando transmissão SEFAZ (contingência PDV)",
		dadosimportacao: {
			origem: "pdv-hibrido-contingencia",
			idvenda: idvenda ?? null,
			tpEmis: 9,
		},
	};

	await criarNotaFiscalComItens(dadosNota, []);

	if (chave) {
		await arquivarXmlNotaFiscal({
			idnotafiscal,
			idempresa,
			xml,
			chavenfe: chave,
			tipo: "assinado",
		}).catch(console.error);
	}

	return httpCriacao<TransmitirNfceContingenciaResultado>({
		idnotafiscal,
		status: "pendente_transmissao",
		transmitida: false,
		chave,
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
