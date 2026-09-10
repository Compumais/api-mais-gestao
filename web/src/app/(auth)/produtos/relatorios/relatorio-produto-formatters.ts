import dayjs from "dayjs";
import { formatDataCivilBrasilia, formatDateTimeBrasilia } from "@/lib/date";
import type { ColunaRelatorioProduto } from "@/services/relatorios-produtos.service";

const moeda = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

const numero = new Intl.NumberFormat("pt-BR", {
	maximumFractionDigits: 3,
});

const percentual = new Intl.NumberFormat("pt-BR", {
	style: "percent",
	maximumFractionDigits: 2,
});

function comoNumero(valor: string | number): number | null {
	const convertido =
		typeof valor === "number"
			? valor
			: Number(valor.replace(/\s/g, "").replace(",", "."));
	return Number.isFinite(convertido) ? convertido : null;
}

export function formatarValorRelatorio(
	valor: string | number | null,
	tipo: ColunaRelatorioProduto["tipo"] = "texto",
): string {
	if (valor === null || valor === "") return "—";

	if (tipo === "data") {
		const texto = String(valor);
		return dayjs(texto).isValid() ? formatDataCivilBrasilia(texto) : texto;
	}

	if (tipo === "datahora") {
		const texto = String(valor);
		return dayjs(texto).isValid() ? formatDateTimeBrasilia(texto) : texto;
	}

	if (tipo === "moeda" || tipo === "numero" || tipo === "percentual") {
		const valorNumerico = comoNumero(valor);
		if (valorNumerico === null) return String(valor);
		if (tipo === "moeda") return moeda.format(valorNumerico);
		if (tipo === "percentual") {
			return percentual.format(valorNumerico / 100);
		}
		return numero.format(valorNumerico);
	}

	return String(valor);
}

export function formatarChaveResumo(chave: string): string {
	const texto = chave
		.replace(/([a-z\d])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim();
	return texto
		.split(" ")
		.filter(Boolean)
		.map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
		.join(" ");
}

export function baixarBlobRelatorio(blob: Blob, nomeArquivo: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = nomeArquivo;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
