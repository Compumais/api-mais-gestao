export const CODIGO_PLANO_VENDAS_DINHEIRO = "1 1 1";
export const CODIGO_PLANO_VENDAS_CARTAO_CREDITO = "1 1 2";
export const CODIGO_PLANO_VENDAS_CARTAO_DEBITO = "1 1 3";
export const CODIGO_PLANO_VENDAS_PIX = "1 1 4";
export const CODIGO_PLANO_VENDAS_PREPAGO = "1 1 5";

export const TIPO_ORIGEM_VENDA_PDV = 1;

export function formatarDataIso(data: Date): string {
	return data.toISOString().slice(0, 10);
}

export function adicionarDias(dataBase: Date, dias: number): string {
	const data = new Date(dataBase);
	data.setDate(data.getDate() + dias);
	return formatarDataIso(data);
}

export function parseValorMonetario(
	valor: string | null | undefined,
): number {
	if (!valor) {
		return 0;
	}

	const numero = Number(valor);

	if (!Number.isFinite(numero) || numero <= 0) {
		return 0;
	}

	return numero;
}

export function formatarValorMonetario(valor: number): string {
	return valor.toFixed(2);
}
