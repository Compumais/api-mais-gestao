import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import {
	buscarIbptAliquotasPorNcms,
	buscarUltimaImportacaoIbptPorUf,
} from "@/repositories/ibpt-repositories.js";
import {
	montarTextoTributosAproximadosIbpt,
	origemProdutoEhImportado,
} from "@/util/parsear-arquivo-ibpt.js";

export type ItemTributosAproximadosIbpt = ItemPayloadNfe & {
	valorTributosAproximados?: number;
	valorTributoFederal?: number;
	valorTributoEstadual?: number;
	valorTributoMunicipal?: number;
	chaveIbpt?: string;
	fonteIbpt?: string;
};

export type ResultadoTributosAproximadosIbpt = {
	itens: ItemTributosAproximadosIbpt[];
	totalFederal: number;
	totalEstadual: number;
	totalMunicipal: number;
	totalAproximado: number;
	chave?: string;
	fonte?: string;
	texto?: string;
	pendencias: string[];
};

function arredondar2(valor: number): number {
	return Math.round(valor * 100) / 100;
}

export async function calcularTributosAproximadosIbpt(params: {
	uf: string;
	itens: ItemPayloadNfe[];
}): Promise<ResultadoTributosAproximadosIbpt> {
	const uf = params.uf.trim().toUpperCase();
	const pendencias: string[] = [];

	if (uf.length !== 2) {
		return {
			itens: params.itens,
			totalFederal: 0,
			totalEstadual: 0,
			totalMunicipal: 0,
			totalAproximado: 0,
			pendencias: ["UF do emitente não configurada para cálculo IBPT"],
		};
	}

	const ultimaImportacao = await buscarUltimaImportacaoIbptPorUf(uf);
	if (!ultimaImportacao) {
		return {
			itens: params.itens,
			totalFederal: 0,
			totalEstadual: 0,
			totalMunicipal: 0,
			totalAproximado: 0,
			pendencias: [
				`Tabela IBPT não importada para a UF ${uf}. Importe em Configurações > NF-e.`,
			],
		};
	}

	const ncms = params.itens.map((item) => item.ncm);
	const mapaAliquotas = await buscarIbptAliquotasPorNcms(uf, ncms);

	let totalFederal = 0;
	let totalEstadual = 0;
	let totalMunicipal = 0;
	let chave = ultimaImportacao.chave;
	let fonte = ultimaImportacao.fonte ?? "IBPT/empresometro.com.br";
	const ncmsAusentes = new Set<string>();

	const itens: ItemTributosAproximadosIbpt[] = params.itens.map((item) => {
		const ncm = item.ncm.replace(/\D/g, "").padStart(8, "0").slice(0, 8);
		const aliquota = mapaAliquotas.get(ncm);
		const base = arredondar2(item.quantidade * item.valorUnitario);

		if (!aliquota) {
			if (ncm && ncm !== "00000000") ncmsAusentes.add(ncm);
			return { ...item };
		}

		const importado = origemProdutoEhImportado(item.orig);
		const aliqFederal = importado
			? Number(aliquota.aliquotaImportado)
			: Number(aliquota.aliquotaNacional);
		const aliqEstadual = Number(aliquota.aliquotaEstadual);
		const aliqMunicipal = Number(aliquota.aliquotaMunicipal);

		const valorTributoFederal = arredondar2((base * aliqFederal) / 100);
		const valorTributoEstadual = arredondar2((base * aliqEstadual) / 100);
		const valorTributoMunicipal = arredondar2((base * aliqMunicipal) / 100);
		const valorTributosAproximados = arredondar2(
			valorTributoFederal + valorTributoEstadual + valorTributoMunicipal,
		);

		totalFederal = arredondar2(totalFederal + valorTributoFederal);
		totalEstadual = arredondar2(totalEstadual + valorTributoEstadual);
		totalMunicipal = arredondar2(totalMunicipal + valorTributoMunicipal);
		chave = aliquota.chave;
		fonte = aliquota.fonte;

		return {
			...item,
			valorTributosAproximados,
			valorTributoFederal,
			valorTributoEstadual,
			valorTributoMunicipal,
			chaveIbpt: aliquota.chave,
			fonteIbpt: aliquota.fonte,
		};
	});

	if (ncmsAusentes.size > 0) {
		const amostra = [...ncmsAusentes].slice(0, 5).join(", ");
		pendencias.push(
			`NCM(s) sem alíquota IBPT na UF ${uf}: ${amostra}${
				ncmsAusentes.size > 5 ? "..." : ""
			}`,
		);
	}

	const totalAproximado = arredondar2(
		totalFederal + totalEstadual + totalMunicipal,
	);

	const texto =
		totalAproximado > 0 && chave
			? montarTextoTributosAproximadosIbpt({
					totalFederal,
					totalEstadual,
					totalMunicipal,
					uf,
					chave,
					fonte,
				})
			: undefined;

	return {
		itens,
		totalFederal,
		totalEstadual,
		totalMunicipal,
		totalAproximado,
		chave,
		fonte,
		texto,
		pendencias,
	};
}
