import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function money(value: number): string {
	return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Converte uma string de dígitos (centavos) digitada no teclado numérico em valor decimal. */
export function centavosToNumber(digitos: string): number {
	return Number(digitos || "0") / 100;
}
