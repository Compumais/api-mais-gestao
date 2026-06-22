export type StatusImportacaoOfx =
	| "pendente"
	| "importada"
	| "duplicada"
	| "ignorada";

export type TransacaoOfx = {
	idTemporario: string;
	data: string;
	valor: string;
	tipo: "C" | "D";
	historico: string;
	documento: string | null;
};

export type LinhaImportacaoOfx = TransacaoOfx & {
	status: StatusImportacaoOfx;
	idplanocontasSelecionado?: string;
	idLancamentoCriado?: string;
};

export function tipomovimentoPorTipoOfx(tipo: "C" | "D"): "E" | "S" {
	return tipo === "C" ? "E" : "S";
}

export function labelTipoOfx(tipo: "C" | "D"): string {
	return tipo === "C" ? "Entrada" : "Saída";
}

export function labelStatusImportacaoOfx(status: StatusImportacaoOfx): string {
	switch (status) {
		case "pendente":
			return "Pendente";
		case "importada":
			return "Importada";
		case "duplicada":
			return "Duplicada";
		case "ignorada":
			return "Ignorada";
	}
}

export function classeStatusImportacaoOfx(status: StatusImportacaoOfx): string {
	switch (status) {
		case "pendente":
			return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
		case "importada":
			return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
		case "duplicada":
			return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
		case "ignorada":
			return "bg-muted text-muted-foreground";
	}
}

export function formatarValorOfx(valor: string): string {
	const numero = Number.parseFloat(valor);
	if (!Number.isFinite(numero)) {
		return valor;
	}

	return numero.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

export function formatarDataOfx(data: string): string {
	const [ano, mes, dia] = data.split("-");
	if (!ano || !mes || !dia) {
		return data;
	}

	return `${dia}/${mes}/${ano}`;
}

export function truncarDocumento(documento: string | null, max = 30): string {
	if (!documento) {
		return "—";
	}

	if (documento.length <= max) {
		return documento;
	}

	return `${documento.slice(0, max)}…`;
}
