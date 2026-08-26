export function parseNumeroEfd(
	valor: string | number | null | undefined,
): number {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	return Number.isFinite(numero) ? numero : 0;
}

export function campoTexto(
	valor: string | number | null | undefined,
	maximo?: number,
): string {
	const texto = String(valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
	if (maximo && texto.length > maximo) return texto.slice(0, maximo);
	return texto;
}

export function campoNumerico(
	valor: string | number | null | undefined,
): string {
	return String(valor ?? "").replace(/\D/g, "");
}

export function campoDecimal(
	valor: string | number | null | undefined,
	decimais = 2,
): string {
	const numero = parseNumeroEfd(valor);
	return numero.toFixed(decimais).replace(".", ",");
}

export function campoDataDdmmaaaa(data: string | null | undefined): string {
	const iso = String(data ?? "").slice(0, 10);
	const partes = iso.split("-");
	if (partes.length === 3) {
		return `${partes[2]}${partes[1]}${partes[0]}`;
	}
	return "";
}

export function campoCnpjCpf(valor: string | null | undefined): string {
	return campoNumerico(valor).slice(-14);
}

export function montarLinhaPipe(
	campos: Array<string | number | null | undefined>,
): string {
	const partes = campos.map((campo) => (campo == null ? "" : String(campo)));
	return `|${partes.join("|")}|`;
}

export function formatarCstIcmsEfd(
	origem: number | string | null | undefined,
	cst: string | null | undefined,
	csosn?: string | null,
): string {
	const orig =
		String(origem ?? 0)
			.replace(/\D/g, "")
			.slice(-1) || "0";
	const situacao = String(cst || csosn || "00").replace(/\D/g, "");
	if (situacao.length >= 3) {
		return `${orig}${situacao}`.slice(0, 4);
	}
	return `${orig}${situacao.padStart(2, "0")}`;
}
