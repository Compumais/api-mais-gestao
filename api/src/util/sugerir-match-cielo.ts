import type { LinhaRecebivelCielo } from "@/util/parse-csv-cielo.js";

export type TituloCandidatoCielo = {
	id: string;
	documento: string | null;
	historico: string | null;
	nossonumero: string | null;
	nomebandeira: string | null;
	valor: string | null;
	saldo: string | null;
	emissao: string | null;
	vencimento: string | null;
	parcela: number | null;
	totalparcelas: number | null;
	extra1?: string | null;
	extra2?: string | null;
	extra3?: string | null;
	extra4?: string | null;
	extra5?: string | null;
};

export type SugestaoMatchCielo = {
	idfinanceiro: string | null;
	confianca: number;
	motivo: string | null;
};

function textoContem(haystack: string | null | undefined, needle: string | null) {
	if (!haystack || !needle) return false;
	return haystack.toLowerCase().includes(needle.toLowerCase());
}

function numero(valor: string | null | undefined) {
	const n = Number(valor ?? 0);
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function diasEntre(a: string | null, b: string | null) {
	if (!a || !b) return null;
	const da = Date.parse(`${a}T00:00:00Z`);
	const db = Date.parse(`${b}T00:00:00Z`);
	if (Number.isNaN(da) || Number.isNaN(db)) return null;
	return Math.abs(Math.round((da - db) / 86400000));
}

function camposTexto(titulo: TituloCandidatoCielo) {
	return [
		titulo.documento,
		titulo.historico,
		titulo.nossonumero,
		titulo.extra1,
		titulo.extra2,
		titulo.extra3,
		titulo.extra4,
		titulo.extra5,
	]
		.filter(Boolean)
		.join(" ");
}

export function sugerirMatchCielo(
	item: LinhaRecebivelCielo,
	titulos: TituloCandidatoCielo[],
): SugestaoMatchCielo {
	let melhor: SugestaoMatchCielo = {
		idfinanceiro: null,
		confianca: 0,
		motivo: null,
	};

	const bruto = numero(item.valorbruto);
	const liquido = numero(item.valorliquido);

	for (const titulo of titulos) {
		const bag = camposTexto(titulo);
		let confianca = 0;
		const motivos: string[] = [];

		if (item.nsu && textoContem(bag, item.nsu)) {
			confianca += 55;
			motivos.push("NSU");
		}
		if (item.codigoautorizacao && textoContem(bag, item.codigoautorizacao)) {
			confianca += 45;
			motivos.push("autorização");
		}
		if (item.codigovenda && textoContem(bag, item.codigovenda)) {
			confianca += 35;
			motivos.push("código da venda");
		}
		if (item.tid && textoContem(bag, item.tid)) {
			confianca += 35;
			motivos.push("TID");
		}

		const valorTitulo = numero(titulo.saldo) || numero(titulo.valor);
		const bateValor =
			Math.abs(valorTitulo - bruto) <= 0.02 ||
			Math.abs(valorTitulo - liquido) <= 0.02;
		if (bateValor) {
			confianca += 25;
			motivos.push("valor");
		}

		const diasVenda = diasEntre(item.datavenda, titulo.emissao);
		if (diasVenda != null && diasVenda <= 1) {
			confianca += 15;
			motivos.push("data da venda");
		} else if (diasVenda != null && diasVenda <= 3) {
			confianca += 8;
			motivos.push("data próxima");
		}

		const diasPagamento = diasEntre(
			item.datapagamento ?? item.dataprevistapagamento,
			titulo.vencimento,
		);
		if (diasPagamento != null && diasPagamento <= 2) {
			confianca += 8;
			motivos.push("vencimento");
		}

		if (
			item.bandeira &&
			titulo.nomebandeira &&
			titulo.nomebandeira.toLowerCase().includes(item.bandeira.toLowerCase())
		) {
			confianca += 8;
			motivos.push("bandeira");
		}

		if (
			item.parcela != null &&
			titulo.parcela != null &&
			item.parcela === titulo.parcela
		) {
			confianca += 6;
			motivos.push("parcela");
		}

		if (confianca > melhor.confianca) {
			melhor = {
				idfinanceiro: titulo.id,
				confianca: Math.min(100, confianca),
				motivo: motivos.join(", "),
			};
		}
	}

	if (melhor.confianca < 40) {
		return { idfinanceiro: null, confianca: 0, motivo: null };
	}
	return melhor;
}
