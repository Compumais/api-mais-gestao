export type RegimeTributarioEmpresa = "SN" | "LP" | "LR";

export type ConfigRegimeImportacaoNf = {
	regime: RegimeTributarioEmpresa | null;
	permiteCreditoIcms: boolean;
	permiteCreditoPisCofins: boolean;
	permiteCreditoIpi: boolean;
	usarCsosn: boolean;
};

const REGIMES_VALIDOS = new Set<RegimeTributarioEmpresa>(["SN", "LP", "LR"]);

export function normalizarRegimeTributario(
	valor?: string | null,
): RegimeTributarioEmpresa | null {
	if (!valor?.trim()) return null;
	const texto = valor.trim().toUpperCase();
	if (REGIMES_VALIDOS.has(texto as RegimeTributarioEmpresa)) {
		return texto as RegimeTributarioEmpresa;
	}
	return null;
}

/** Deriva SN/LP a partir do CRT da NF-e (fonte da verdade na UI fiscal). */
export function derivarRegimeTributarioDoCrt(
	crt?: number | string | null,
): RegimeTributarioEmpresa | null {
	if (crt == null || crt === "") return null;
	const codigo = typeof crt === "number" ? crt : Number(String(crt).trim());
	if (!Number.isInteger(codigo)) return null;
	if (codigo === 1 || codigo === 2 || codigo === 4) return "SN";
	if (codigo === 3) return "LP";
	return null;
}

export function obterConfigRegimeImportacaoNf(
	regime?: string | null,
): ConfigRegimeImportacaoNf {
	const regimeNormalizado = normalizarRegimeTributario(regime);

	if (regimeNormalizado === "SN") {
		return {
			regime: regimeNormalizado,
			permiteCreditoIcms: false,
			permiteCreditoPisCofins: false,
			permiteCreditoIpi: false,
			usarCsosn: true,
		};
	}

	if (regimeNormalizado === "LP" || regimeNormalizado === "LR") {
		return {
			regime: regimeNormalizado,
			permiteCreditoIcms: true,
			permiteCreditoPisCofins: regimeNormalizado === "LR",
			permiteCreditoIpi: true,
			usarCsosn: false,
		};
	}

	return {
		regime: null,
		permiteCreditoIcms: false,
		permiteCreditoPisCofins: false,
		permiteCreditoIpi: false,
		usarCsosn: false,
	};
}
