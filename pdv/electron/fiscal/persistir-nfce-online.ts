import { v4 as uuidv4 } from "uuid";
import { buscarCupomNfce } from "../api/client";
import {
	atualizarNfceLocalCampos,
	obterNfcePorVenda,
	salvarNfceLocal,
} from "../db/repos";

export type DadosNfceOnline = {
	idvenda: string;
	idnotafiscal?: string;
	chave?: string;
	qrCode?: string;
	protocolo?: string;
	xml?: string;
	serie?: string | number;
	numero?: number;
};

function serieNumeroDaChave(chave?: string): {
	serie?: number;
	numero?: number;
} {
	const digits = (chave ?? "").replace(/\D/g, "");
	if (digits.length !== 44) {
		return {};
	}
	const serie = Number(digits.slice(22, 25));
	const numero = Number(digits.slice(25, 34));
	return {
		...(Number.isFinite(serie) && serie > 0 ? { serie } : {}),
		...(Number.isFinite(numero) && numero > 0 ? { numero } : {}),
	};
}

async function resolverXml(
	dados: DadosNfceOnline,
): Promise<string | undefined> {
	if (dados.xml?.trim()) {
		return dados.xml;
	}
	if (!dados.idnotafiscal) {
		return undefined;
	}
	try {
		const cupom = await buscarCupomNfce(dados.idnotafiscal);
		return cupom.xml;
	} catch {
		return undefined;
	}
}

export async function persistirNfceOnlineLocal(
	dados: DadosNfceOnline,
): Promise<void> {
	const xml = await resolverXml(dados);
	const daChave = serieNumeroDaChave(dados.chave);
	const serie = Number(dados.serie ?? daChave.serie ?? 0);
	const numero = Number(dados.numero ?? daChave.numero ?? 0);
	if (
		!Number.isFinite(serie) ||
		serie < 1 ||
		!Number.isFinite(numero) ||
		numero < 1
	) {
		return;
	}

	const existente = await obterNfcePorVenda(dados.idvenda);
	if (existente) {
		await atualizarNfceLocalCampos(existente.id, {
			xml: xml ?? null,
			chave: dados.chave ?? null,
			qrcode: dados.qrCode ?? null,
			protocolo: dados.protocolo ?? null,
			serie,
			numero,
			status: "autorizada",
			transmitida: true,
		});
		return;
	}

	await salvarNfceLocal({
		id: dados.idnotafiscal ?? uuidv4(),
		idvenda: dados.idvenda,
		serie,
		numero,
		chave: dados.chave,
		tpemis: 1,
		status: "autorizada",
		xml,
		qrcode: dados.qrCode,
		protocolo: dados.protocolo,
		transmitida: true,
	});
}
