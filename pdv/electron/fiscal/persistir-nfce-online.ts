import { v4 as uuidv4 } from "uuid";
import { buscarCupomNfce } from "../api/client";
import {
	atualizarNfceLocalCampos,
	atualizarVendaSync,
	avancarNumeracaoNfceAposEmissao,
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

export type ResultadoEmissaoParaPersistir = {
	emitida: boolean;
	idnotafiscal?: string;
	chave?: string;
	qrCode?: string;
	protocolo?: string;
	xml?: string;
	serie?: string | number;
	numero?: number;
	statusLocal?:
		| "autorizada"
		| "erro"
		| "inutilizada"
		| "cancelada"
		| "pendente";
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

function numeracaoValida(serie: number, numero: number): boolean {
	return (
		Number.isFinite(serie) &&
		serie >= 1 &&
		Number.isFinite(numero) &&
		numero >= 1
	);
}

async function resolverXml(
	dados: DadosNfceOnline,
	status: "autorizada" | "erro" | "inutilizada" | "cancelada" | "pendente",
): Promise<string | undefined> {
	if (dados.xml?.trim()) {
		return dados.xml;
	}
	if (status !== "autorizada" || !dados.idnotafiscal) {
		return undefined;
	}
	try {
		const cupom = await buscarCupomNfce(dados.idnotafiscal);
		return cupom.xml;
	} catch {
		return undefined;
	}
}

async function gravarNfceLocal(
	dados: DadosNfceOnline,
	status: "autorizada" | "erro" | "inutilizada" | "cancelada" | "pendente",
): Promise<boolean> {
	const xml = await resolverXml(dados, status);
	const daChave = serieNumeroDaChave(dados.chave);
	const existente = await obterNfcePorVenda(dados.idvenda);
	const serie = Number(dados.serie ?? daChave.serie ?? existente?.serie ?? 0);
	const numero = Number(
		dados.numero ?? daChave.numero ?? existente?.numero ?? 0,
	);
	if (!numeracaoValida(serie, numero)) {
		return false;
	}

	if (existente) {
		await atualizarNfceLocalCampos(existente.id, {
			xml: xml ?? null,
			chave: dados.chave ?? null,
			qrcode: dados.qrCode ?? null,
			protocolo: dados.protocolo ?? null,
			serie,
			numero,
			status,
			transmitida: status === "autorizada",
		});
		await atualizarVendaSync(dados.idvenda, {
			nfce_status: status,
			idnfce_local: existente.id,
		});
		await avancarNumeracaoNfceAposEmissao(serie, numero);
		return true;
	}

	await salvarNfceLocal({
		id: dados.idnotafiscal ?? uuidv4(),
		idvenda: dados.idvenda,
		serie,
		numero,
		chave: dados.chave,
		tpemis: 1,
		status,
		xml,
		qrcode: dados.qrCode,
		protocolo: dados.protocolo,
		transmitida: status === "autorizada",
	});
	await avancarNumeracaoNfceAposEmissao(serie, numero);
	return true;
}

export async function persistirNfceOnlineLocal(
	dados: DadosNfceOnline,
): Promise<void> {
	await gravarNfceLocal(dados, "autorizada");
}

/** Persiste autorização ou rejeição localmente, incluindo o id da nota na retaguarda. */
export async function aplicarEmissaoNfceNaVendaLocal(
	vendaId: string,
	nfce: ResultadoEmissaoParaPersistir,
): Promise<void> {
	const dados: DadosNfceOnline = {
		idvenda: vendaId,
		idnotafiscal: nfce.idnotafiscal,
		chave: nfce.chave,
		qrCode: nfce.qrCode,
		protocolo: nfce.protocolo,
		xml: nfce.xml,
		serie: nfce.serie,
		numero: nfce.numero,
	};

	if (nfce.emitida || nfce.statusLocal === "autorizada") {
		await gravarNfceLocal(dados, "autorizada");
		return;
	}

	const statusLocal = nfce.statusLocal ?? "erro";
	const gravou = await gravarNfceLocal(dados, statusLocal);
	await atualizarVendaSync(vendaId, {
		nfce_status:
			statusLocal === "pendente" ? "pendente_contingencia" : statusLocal,
		...(!gravou && nfce.idnotafiscal
			? { idnfce_local: nfce.idnotafiscal }
			: {}),
	});
}
