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
	const tpEmis = daChave
		? Number(chave.slice(34, 35))
		: (params.conciliacao?.tpEmis ?? params.tpEmisPadrao ?? 1);
	const dhEmi = params.conciliacao?.dhEmi?.trim() || params.dhEmi;
	const anoMes = daChave ? chave.slice(2, 6) : anoMesChaveDeDhEmi(dhEmi);

	return {
		cNF,
		tpEmis: Number.isFinite(tpEmis) ? tpEmis : 1,
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
