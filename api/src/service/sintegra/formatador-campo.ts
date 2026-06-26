const TAMANHO_LINHA = 126;

export function formatarNumerico(
	valor: string | number | null | undefined,
	tamanho: number,
): string {
	const apenasDigitos = String(valor ?? "")
		.replace(/\D/g, "")
		.slice(-tamanho);
	return apenasDigitos.padStart(tamanho, "0");
}

export function formatarAlfanumerico(
	valor: string | null | undefined,
	tamanho: number,
): string {
	const texto = String(valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.slice(0, tamanho);
	return texto.padEnd(tamanho, " ");
}

export function formatarDecimal(
	valor: string | number | null | undefined,
	tamanho: number,
	decimais: number,
): string {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	const seguro = Number.isFinite(numero) ? numero : 0;
	const inteiro = Math.round(Math.abs(seguro) * 10 ** decimais);
	return formatarNumerico(inteiro, tamanho);
}

export function formatarDataAaaammdd(data: string | null | undefined): string {
	if (!data) return "00000000";
	const normalizada = data.slice(0, 10);
	const partes = normalizada.split("-");
	if (partes.length === 3) {
		return `${partes[0]}${partes[1]}${partes[2]}`;
	}
	const digitos = normalizada.replace(/\D/g, "");
	if (digitos.length >= 8) return digitos.slice(0, 8);
	return "00000000";
}

export function formatarDataAammdd(data: string | null | undefined): string {
	const aaaammdd = formatarDataAaaammdd(data);
	if (aaaammdd === "00000000") return "000000";
	return aaaammdd.slice(2);
}

export function formatarCnpjCpf(valor: string | null | undefined): string {
	return formatarNumerico(valor, 14);
}

export function formatarInscricaoEstadual(valor: string | null | undefined): string {
	const texto = String(valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.trim();
	if (!texto) return " ".repeat(14);
	return formatarAlfanumerico(texto, 14);
}

export function formatarCfop(valor: string | null | undefined): string {
	const digitos = String(valor ?? "").replace(/\D/g, "");
	if (digitos.length === 3) return `0${digitos}`;
	return formatarNumerico(digitos, 4);
}

export function formatarSerie(valor: string | null | undefined): string {
	return formatarAlfanumerico(valor ?? "", 3);
}

export function formatarNumeroDocumento(valor: string | null | undefined): string {
	return formatarNumerico(valor, 6);
}

export function formatarCodigoProduto(valor: string | number | null | undefined): string {
	return formatarAlfanumerico(String(valor ?? ""), 14);
}

export function formatarCst(valor: string | null | undefined, csosn?: string | null): string {
	const cst = String(valor ?? csosn ?? "000").replace(/\D/g, "").slice(0, 3);
	return formatarAlfanumerico(cst.padStart(3, "0"), 3);
}

export function montarLinha(partes: string[]): string {
	const linha = partes.join("").slice(0, TAMANHO_LINHA);
	return linha.padEnd(TAMANHO_LINHA, " ");
}

export { TAMANHO_LINHA };
