/** Portais oficiais de consulta e QR Code da NFC-e por UF. */

export const CODIGO_POR_UF: Record<string, number> = {
	RO: 11,
	AC: 12,
	AM: 13,
	RR: 14,
	PA: 15,
	AP: 16,
	TO: 17,
	MA: 21,
	PI: 22,
	CE: 23,
	RN: 24,
	PB: 25,
	PE: 26,
	AL: 27,
	SE: 28,
	BA: 29,
	MG: 31,
	ES: 32,
	RJ: 33,
	SP: 35,
	PR: 41,
	SC: 42,
	RS: 43,
	MS: 50,
	MT: 51,
	GO: 52,
	DF: 53,
};

const UF_POR_CODIGO: Record<string, string> = Object.fromEntries(
	Object.entries(CODIGO_POR_UF).map(([uf, codigo]) => [String(codigo), uf]),
);

const URL_CONSULTA_NFCE: Record<
	string,
	{ producao: string; homologacao: string }
> = {
	MG: {
		producao: "https://portalsped.fazenda.mg.gov.br/portalnfce",
		homologacao: "https://hportalsped.fazenda.mg.gov.br/portalnfce",
	},
	SP: {
		producao: "https://www.nfce.fazenda.sp.gov.br/consulta",
		homologacao:
			"https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica",
	},
};

const URL_QRCODE_NFCE: Record<
	string,
	{ producao: string; homologacao: string }
> = {
	MG: {
		producao:
			"https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
		homologacao:
			"https://hportalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml",
	},
	SP: {
		producao: "https://www.nfce.fazenda.sp.gov.br/qrcode",
		homologacao:
			"https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
	},
};

export function codigoIbgeDaUf(uf?: string): number | undefined {
	if (!uf) return undefined;
	return CODIGO_POR_UF[uf.toUpperCase()];
}

export function ufDaChaveAcesso(chave?: string): string | undefined {
	const digits = (chave ?? "").replace(/\D/g, "");
	if (digits.length < 2) return undefined;
	return UF_POR_CODIGO[digits.slice(0, 2)];
}

function portal(
	mapa: Record<string, { producao: string; homologacao: string }>,
	uf: string | undefined,
	homologacao: boolean,
): string | undefined {
	if (!uf) return undefined;
	const urls = mapa[uf.toUpperCase()];
	if (!urls) return undefined;
	return homologacao ? urls.homologacao : urls.producao;
}

export function urlConsultaNfce(
	uf: string | undefined,
	homologacao: boolean,
): string | undefined {
	return portal(URL_CONSULTA_NFCE, uf, homologacao);
}

export function urlQrCodeNfce(
	uf: string | undefined,
	homologacao: boolean,
): string | undefined {
	return (
		portal(URL_QRCODE_NFCE, uf, homologacao) ?? urlConsultaNfce(uf, homologacao)
	);
}

export function resolverUfEmitente(params: {
	uf?: string;
	chave?: string;
}): string | undefined {
	const uf = params.uf?.trim().toUpperCase();
	if (uf && CODIGO_POR_UF[uf]) return uf;
	return ufDaChaveAcesso(params.chave);
}

function hostnameDeUrl(valor: string): string {
	try {
		return new URL(valor).hostname.toLowerCase();
	} catch {
		return "";
	}
}

function urlPertenceAUf(url: string, uf: string): boolean {
	const host = hostnameDeUrl(url);
	if (!host) return false;
	return host.includes(`.${uf.toLowerCase()}.gov.br`);
}

/** URL impressa em "Consulte pela Chave de Acesso": portal da UF, nunca a origem do QR. */
export function resolverUrlConsultaNfce(params: {
	uf?: string;
	chave?: string;
	homologacao?: boolean;
	urlXml?: string;
}): string | undefined {
	const uf = resolverUfEmitente(params);
	const oficial = urlConsultaNfce(uf, params.homologacao === true);
	if (oficial) return oficial;
	const xml = params.urlXml?.trim();
	if (!xml) return undefined;
	return xml.split("?")[0]?.replace(/\/$/, "") || xml;
}

/**
 * Mantém o QR da SEFAZ quando já é da UF do emitente.
 * Se o QR apontar para outro estado (ex.: SP em empresa de MG), troca só a base.
 */
export function corrigirQrCodeNfce(params: {
	qrcode?: string;
	uf?: string;
	chave?: string;
	homologacao?: boolean;
}): string | undefined {
	const qrcode = params.qrcode?.trim();
	if (!qrcode) return undefined;
	const uf = resolverUfEmitente(params);
	if (!uf || urlPertenceAUf(qrcode, uf)) return qrcode;
	const base = urlQrCodeNfce(uf, params.homologacao === true);
	if (!base) return qrcode;
	const idx = qrcode.indexOf("?p=");
	if (idx < 0) return qrcode;
	return `${base}${qrcode.slice(idx)}`;
}
