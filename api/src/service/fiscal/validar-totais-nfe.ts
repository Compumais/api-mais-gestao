import { calcularTotaisFiscaisEmissaoNfe } from "@/util/calcular-totais-fiscais-emissao-nfe.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import type { ValidacaoFiscalItem } from "@/model/regra-fiscal-model.js";

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

export function validarTotaisNfe(params: {
	crt: number;
	itens: ItemPayloadNfe[];
	totais?: {
		frete?: number;
		seguro?: number;
		desconto?: number;
		outrasDespesas?: number;
	};
	totaisInformados?: {
		vProd?: number;
		vNF?: number;
		vDesc?: number;
		vFrete?: number;
		vSeg?: number;
		vOutro?: number;
	};
}): ValidacaoFiscalItem[] {
	const calculado = calcularTotaisFiscaisEmissaoNfe(
		params.crt,
		params.itens,
		params.totais ?? {},
	);
	const somaItens = round2(
		params.itens.reduce(
			(acc, item) => acc + round2(item.quantidade * item.valorUnitario),
			0,
		),
	);

	const validacoes: ValidacaoFiscalItem[] = [];

	if (somaItens !== calculado.totalProdutos) {
		validacoes.push({
			status: "INCONSISTENCIA",
			code: "TOTAL_DIVERGENTE",
			field: "vProd",
			expected: somaItens,
			actual: calculado.totalProdutos,
			message: "Soma de vProd dos itens diverge do total de produtos",
			tipoInconsistencia: "BUG_DE_SISTEMA",
		});
	}

	const informados = params.totaisInformados;
	if (informados?.vProd != null && informados.vProd !== calculado.totalProdutos) {
		validacoes.push({
			status: "INCONSISTENCIA",
			code: "TOTAL_DIVERGENTE",
			field: "vProd",
			expected: calculado.totalProdutos,
			actual: informados.vProd,
			message: "vProd informado diverge da soma dos itens",
			tipoInconsistencia: "BUG_DE_SISTEMA",
		});
	}

	if (informados?.vNF != null && informados.vNF !== calculado.totalNota) {
		validacoes.push({
			status: "INCONSISTENCIA",
			code: "TOTAL_DIVERGENTE",
			field: "vNF",
			expected: calculado.totalNota,
			actual: informados.vNF,
			message: "vNF informado diverge do total calculado",
			tipoInconsistencia: "BUG_DE_SISTEMA",
		});
	}

	if (informados?.vDesc != null && informados.vDesc !== calculado.desconto) {
		validacoes.push({
			status: "INCONSISTENCIA",
			code: "TOTAL_DIVERGENTE",
			field: "vDesc",
			expected: calculado.desconto,
			actual: informados.vDesc,
			message: "vDesc informado diverge do desconto calculado",
			tipoInconsistencia: "BUG_DE_SISTEMA",
		});
	}

	if (informados?.vFrete != null && informados.vFrete !== calculado.frete) {
		validacoes.push({
			status: "INCONSISTENCIA",
			code: "TOTAL_DIVERGENTE",
			field: "vFrete",
			expected: calculado.frete,
			actual: informados.vFrete,
			message: "vFrete informado diverge do frete calculado",
			tipoInconsistencia: "BUG_DE_SISTEMA",
		});
	}

	if (validacoes.length === 0) {
		validacoes.push({
			status: "VALIDO",
			code: "TOTAIS_OK",
			message: `Σ vProd = ${calculado.totalProdutos.toFixed(2)}; vNF = ${calculado.totalNota.toFixed(2)}`,
		});
	}

	return validacoes;
}
