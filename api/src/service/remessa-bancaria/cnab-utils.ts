export function padRight(valor: string, tamanho: number): string {
	return valor.slice(0, tamanho).padEnd(tamanho, " ");
}

export function padLeft(valor: string, tamanho: number, char = "0"): string {
	return valor.slice(-tamanho).padStart(tamanho, char);
}

export function somenteDigitos(valor: string | null | undefined): string {
	return (valor ?? "").replace(/\D/g, "");
}

export function valorCentavos(
	valor: string | null | undefined,
	tamanho = 15,
): string {
	return padLeft(String(Math.round(Number(valor ?? 0) * 100)), tamanho);
}

export function dataAaaammdd(valor: string | null | undefined): string {
	const digitos = somenteDigitos(valor);
	if (digitos.length >= 8) return digitos.slice(0, 8);
	return padLeft(digitos, 8);
}

export function dataDdmmaa(valor: string | null | undefined): string {
	const digitos = somenteDigitos(valor);
	if (digitos.length === 8) {
		return `${digitos.slice(6, 8)}${digitos.slice(4, 6)}${digitos.slice(2, 4)}`;
	}
	if (digitos.length === 6) return digitos;
	return padLeft(digitos, 6);
}

export function parseValorCentavos(campo: string): string {
	const digitos = somenteDigitos(campo);
	if (!digitos) return "0.00";
	const inteiro = digitos.slice(0, -2) || "0";
	const decimal = digitos.slice(-2).padStart(2, "0");
	return `${Number(inteiro)}.${decimal}`;
}

export function parseDataCnab8(campo: string): string | null {
	const digitos = somenteDigitos(campo);
	if (digitos.length !== 8 || digitos === "00000000") return null;
	return `${digitos.slice(0, 4)}-${digitos.slice(4, 6)}-${digitos.slice(6, 8)}`;
}

export function parseDataCnab6(campo: string): string | null {
	const digitos = somenteDigitos(campo);
	if (digitos.length !== 6 || digitos === "000000") return null;
	const dia = digitos.slice(0, 2);
	const mes = digitos.slice(2, 4);
	const ano = digitos.slice(4, 6);
	const anoCompleto = Number(ano) >= 70 ? `19${ano}` : `20${ano}`;
	return `${anoCompleto}-${mes}-${dia}`;
}
