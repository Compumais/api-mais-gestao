import type { ConfigRegimeImportacaoNf } from "@/util/regime-tributario-empresa.js";

export function inferirCodigoCfopSaida(codigoEntrada: string): string | null {
	const digitos = codigoEntrada.replace(/\D/g, "");
	if (digitos.length < 4) return null;

	const primeiro = digitos[0];
	if (primeiro === "1") {
		return `5${digitos.slice(1)}`;
	}
	if (primeiro === "2") {
		return `6${digitos.slice(1)}`;
	}
	if (primeiro === "3") {
		return `7${digitos.slice(1)}`;
	}

	return null;
}

export function obterFlagsCreditoItemImportacao(
	config: ConfigRegimeImportacaoNf,
	tributacao: {
		ipi?: string | undefined;
		icmsst?: string | undefined;
	},
): { gerarcreditoipi: number; gerarcreditoicmsst: number } {
	const temIpi = !!tributacao.ipi && parseFloat(tributacao.ipi) > 0;
	const temSt = !!tributacao.icmsst && parseFloat(tributacao.icmsst) > 0;

	return {
		gerarcreditoipi:
			config.permiteCreditoIpi && temIpi ? 1 : 0,
		gerarcreditoicmsst:
			config.permiteCreditoIcms && temSt ? 1 : 0,
	};
}
