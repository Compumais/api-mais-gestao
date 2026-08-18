import {
	buscarEstadoPorCodigoIbge,
	buscarEstadoPorSigla,
} from "@/constants/estados-brasil.js";

export function inteiroOuNulo(valor: unknown): number | null {
	if (valor == null || valor === "") return null;
	const numero =
		typeof valor === "number" ? valor : Number(String(valor).trim());
	if (!Number.isInteger(numero)) return null;
	return numero;
}

export function normalizarCrt(valor: unknown): number | null {
	const crt = inteiroOuNulo(valor);
	if (crt == null || crt < 1 || crt > 4) return null;
	return crt;
}

export function normalizarAmbienteSefaz(valor: unknown): 1 | 2 {
	return inteiroOuNulo(valor) === 1 ? 1 : 2;
}

export function comAmbienteSefazNumerico<T extends { ambiente?: unknown }>(
	config: T,
): T & { ambiente: 1 | 2 } {
	return {
		...config,
		ambiente: normalizarAmbienteSefaz(config.ambiente),
	};
}

export function normalizarUfFiscal(valor: unknown): string | null {
	const texto = String(valor ?? "")
		.trim()
		.toUpperCase();
	if (!texto) return null;

	const porSigla = buscarEstadoPorSigla(texto);
	if (porSigla) return porSigla.idestado;

	const porIbge = buscarEstadoPorCodigoIbge(texto);
	return porIbge?.idestado ?? null;
}

export function normalizarCodigoMunicipioIbge(valor: unknown): string | null {
	const digitos = String(valor ?? "").replace(/\D/g, "");
	if (!digitos) return null;
	return digitos.padStart(7, "0").slice(-7);
}
