import { randomInt } from "node:crypto";
import { calcularDigitoVerificadorChaveNfe } from "@/util/decodificar-chave-nfe.js";

export type IdentidadeEmissaoNfce = {
	cNF: string;
	tpEmis: number;
	dhEmi: string;
	anoMes: string;
	chavePrevista: string | null;
};

export type ConciliacaoPersistidaNfce = {
	cNF?: string;
	tpEmis?: number;
	dhEmi?: string;
	chavePrevista?: string;
	recuperada?: boolean;
	tentativas?: number;
	chaveSefaz?: string;
	conflito?: Record<string, unknown>;
};

export function gerarCodigoNumericoNfce(): string {
	let codigo = "";
	do {
		codigo = String(randomInt(0, 100_000_000)).padStart(8, "0");
	} while (codigo === "00000000");
	return codigo;
}

export function anoMesChaveDeDhEmi(dhEmi: string): string {
	const match = dhEmi.match(/^(\d{4})-(\d{2})/);
	if (!match?.[1] || !match[2]) return "";
	return `${match[1].slice(2)}${match[2]}`;
}

export function montarChaveAcessoNfce(params: {
	cUF: number | string;
	anoMes: string;
	cnpj: string;
	modelo?: string;
	serie: number | string;
	numero: number | string;
	tpEmis: number | string;
	cNF: string;
}): string | null {
	const cUF = String(params.cUF).replace(/\D/g, "").padStart(2, "0");
	const cnpj = params.cnpj.replace(/\D/g, "");
	const modelo = (params.modelo ?? "65").replace(/\D/g, "").padStart(2, "0");
	const serie = String(params.serie).replace(/\D/g, "").padStart(3, "0");
	const numero = String(params.numero).replace(/\D/g, "").padStart(9, "0");
	const tpEmis = String(params.tpEmis).replace(/\D/g, "");
	const cNF = params.cNF.replace(/\D/g, "");

	if (
		cUF.length !== 2 ||
		params.anoMes.length !== 4 ||
		cnpj.length !== 14 ||
		modelo.length !== 2 ||
		serie.length !== 3 ||
		numero.length !== 9 ||
		tpEmis.length !== 1 ||
		cNF.length !== 8 ||
		cNF === "00000000"
	) {
		return null;
	}

	const corpo = `${cUF}${params.anoMes}${cnpj}${modelo}${serie}${numero}${tpEmis}${cNF}`;
	const dv = calcularDigitoVerificadorChaveNfe(corpo);
	return `${corpo}${dv}`;
}

export function lerRegistroImportacao(valor: unknown): Record<string, unknown> {
	if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
		return {};
	}
	return { ...(valor as Record<string, unknown>) };
}

export function lerConciliacaoPersistida(
	dadosimportacao: unknown,
): ConciliacaoPersistidaNfce {
	const registro = lerRegistroImportacao(dadosimportacao);
	const conciliacao = registro.conciliacao;
	if (
		!conciliacao ||
		typeof conciliacao !== "object" ||
		Array.isArray(conciliacao)
	) {
		return {};
	}
	return conciliacao as ConciliacaoPersistidaNfce;
}

export function mesclarConciliacaoNfce(
	dadosimportacao: unknown,
	conciliacao: ConciliacaoPersistidaNfce,
): Record<string, unknown> {
	const registro = lerRegistroImportacao(dadosimportacao);
	const atual = lerConciliacaoPersistida(dadosimportacao);
	return {
		...registro,
		conciliacao: {
			...atual,
			...conciliacao,
		},
	};
}

/** Contingência EPEC (4) e off-line (9): o cupom já impresso fixa dhEmi e dhCont. */
const TP_EMIS_PRESERVA_DHEMI = new Set([4, 9]);

export function resolverIdentidadeEmissaoNfce(params: {
	dhEmi: string;
	cUF: number | string;
	cnpj: string;
	serie: number | string;
	numero: number | string;
	chaveAtual?: string | null;
	conciliacao?: ConciliacaoPersistidaNfce | null;
	tpEmisPadrao?: number;
}): IdentidadeEmissaoNfce {
	const chave = params.chaveAtual?.replace(/\D/g, "") ?? "";
	const daChave = chave.length === 44;
	const cNF =
		(daChave ? chave.slice(35, 43) : null) ??
		params.conciliacao?.cNF ??
		gerarCodigoNumericoNfce();
	const tpEmisBruto = daChave
		? Number(chave.slice(34, 35))
		: (params.conciliacao?.tpEmis ?? params.tpEmisPadrao ?? 1);
	const tpEmis = Number.isFinite(tpEmisBruto) ? tpEmisBruto : 1;
	const dhEmiAtual = params.dhEmi.trim();
	const dhEmiPersistido = params.conciliacao?.dhEmi?.trim() ?? "";
	// NT 2026.002, regra B09-40 (cStat 704): emissão normal (tpEmis 1, 6 ou 7)
	// rejeita dhEmi com atraso superior a 5 minutos em relação à recepção.
	// Retransmitir com o horário gravado na primeira tentativa repete a rejeição.
	const preservarDhEmi =
		TP_EMIS_PRESERVA_DHEMI.has(tpEmis) && dhEmiPersistido !== "";
	const dhEmi = preservarDhEmi
		? dhEmiPersistido
		: dhEmiAtual || dhEmiPersistido;
	const anoMesDhEmi = anoMesChaveDeDhEmi(dhEmi);
	const anoMesChave = daChave ? chave.slice(2, 6) : "";
	const anoMes =
		preservarDhEmi && anoMesChave
			? anoMesChave
			: anoMesChave && anoMesChave === anoMesDhEmi
				? anoMesChave
				: anoMesDhEmi || anoMesChave;

	return {
		cNF,
		tpEmis,
		dhEmi,
		anoMes,
		chavePrevista: montarChaveAcessoNfce({
			cUF: params.cUF,
			anoMes,
			cnpj: params.cnpj,
			serie: params.serie,
			numero: params.numero,
			tpEmis,
			cNF,
		}),
	};
}
