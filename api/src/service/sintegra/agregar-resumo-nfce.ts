import type { ResumoNfceDiarioSintegra } from "./tipos-sintegra.js";

export type NotaNfceParaResumo = {
	emissao: string | null;
	modelo: string | null;
	serie: string | null;
	numero: string | null;
	valorTotal: string | null;
	baseIcms: string | null;
	valorIcms: string | null;
	aliquota: string | null;
};

function parseNumero(valor: string | null | undefined): number {
	const numero = Number.parseFloat(String(valor ?? "0").replace(",", "."));
	return Number.isFinite(numero) ? numero : 0;
}

function parseNumeroDocumento(valor: string | null | undefined): number {
	const digitos = String(valor ?? "").replace(/\D/g, "");
	if (!digitos) return 0;
	const numero = Number.parseInt(digitos, 10);
	return Number.isFinite(numero) ? numero : 0;
}

/**
 * Classifica valores sem destaque de ICMS (típico Simples Nacional / CSOSN 102)
 * no campo "Outras" do registro 61, mantendo a equação:
 * valorTotal ≈ baseIcms + valorIsento + valorOutras.
 */
export function classificarValoresSemIcms({
	valorTotal,
	baseIcms,
	valorIsento = 0,
}: {
	valorTotal: number;
	baseIcms: number;
	valorIsento?: number;
}): { valorIsento: number; valorOutras: number } {
	const base = Math.max(0, baseIcms);
	const isento = Math.max(0, valorIsento);
	const outras = Math.max(0, Number((valorTotal - base - isento).toFixed(2)));
	return { valorIsento: isento, valorOutras: outras };
}

export function agregarResumoNfceDiario(
	notas: NotaNfceParaResumo[],
): ResumoNfceDiarioSintegra[] {
	type Acumulado = {
		data: string;
		modelo: string;
		serie: string;
		numeroMin: number;
		numeroMax: number;
		numeroInicialRaw: string;
		numeroFinalRaw: string;
		valorTotal: number;
		baseIcms: number;
		valorIcms: number;
		aliquota: string;
	};

	const agrupados = new Map<string, Acumulado>();

	for (const nota of notas) {
		const data = nota.emissao?.slice(0, 10) ?? "";
		if (!data) continue;

		const modelo = nota.modelo ?? "65";
		const serie = nota.serie ?? "";
		const chave = `${data}|${serie}|${modelo}`;
		const numeroAtual = parseNumeroDocumento(nota.numero);
		const numeroRaw = nota.numero ?? "0";
		const existente = agrupados.get(chave);

		if (!existente) {
			agrupados.set(chave, {
				data,
				modelo,
				serie,
				numeroMin: numeroAtual,
				numeroMax: numeroAtual,
				numeroInicialRaw: numeroRaw,
				numeroFinalRaw: numeroRaw,
				valorTotal: parseNumero(nota.valorTotal),
				baseIcms: parseNumero(nota.baseIcms),
				valorIcms: parseNumero(nota.valorIcms),
				aliquota: nota.aliquota ?? "0",
			});
			continue;
		}

		if (numeroAtual < existente.numeroMin) {
			existente.numeroMin = numeroAtual;
			existente.numeroInicialRaw = numeroRaw;
		}
		if (numeroAtual > existente.numeroMax) {
			existente.numeroMax = numeroAtual;
			existente.numeroFinalRaw = numeroRaw;
		}

		existente.valorTotal += parseNumero(nota.valorTotal);
		existente.baseIcms += parseNumero(nota.baseIcms);
		existente.valorIcms += parseNumero(nota.valorIcms);
	}

	return [...agrupados.values()]
		.map((item) => {
			const { valorIsento, valorOutras } = classificarValoresSemIcms({
				valorTotal: item.valorTotal,
				baseIcms: item.baseIcms,
			});

			return {
				data: item.data,
				modelo: item.modelo,
				serie: item.serie,
				numeroInicial: item.numeroInicialRaw,
				numeroFinal: item.numeroFinalRaw,
				valorTotal: item.valorTotal.toFixed(2),
				baseIcms: item.baseIcms.toFixed(2),
				valorIcms: item.valorIcms.toFixed(2),
				valorIsento: valorIsento.toFixed(2),
				valorOutras: valorOutras.toFixed(2),
				aliquota: item.aliquota,
			};
		})
		.sort((a, b) => a.data.localeCompare(b.data));
}
