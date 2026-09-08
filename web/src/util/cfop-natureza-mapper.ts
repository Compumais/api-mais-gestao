import type { TipoConsignacaoCfop } from "@/constants/cfop-natureza";
import type { CfopFormData } from "@/schemas/cfop.schema";

export type CfopApiRegistro = {
	id?: string;
	idempresa?: string;
	codigo?: string | null;
	descricao?: string | null;
	tipoproduto?: string | null;
	inativa?: number | null;
	consideravenda?: number | null;
	considerarservico?: number | null;
	digitarimpostositemnotasaida?: number | null;
	calcularimpostoaproximado?: number | null;
	possuiincentivosfiscais?: number | null;
	consideracustomedio?: number | null;
	informartotaismanualmente?: number | null;
	permitenotasemvalor?: number | null;
	consumidorfinal?: number | null;
	permitirbaixarlotevencido?: number | null;
	naobaixarestoque?: number | null;
	digitartotalitemmanualmente?: number | null;
	considerainscricaoestadualsub?: number | null;
	exigirdocumentoreferenciado?: number | null;
	registrarproducaovenda?: number | null;
	considerarproduto?: number | null;
	naoconsiderapiscofinsproduto?: number | null;
	utilizartodasoperacoes?: number | null;
	interestadualdestmesmauf?: number | null;
	naoconsiderarvlnotafiscalitem?: string | null;
	consignacao?: number | null;
	consignacaoentrada?: number | null;
	presencaconsumidor?: number | null;
	finalidadeemissaonfe?: number | null;
	tipovalorpreco?: number | null;
	integracao?: number | null;
	idplanocontas?: string | null;
	idtipodocumentofinanceiro?: string | null;
	idnaturezaoperacaoinversa?: string | null;
	idnaturezanaocontribuinte?: string | null;
	idnaturezadevolucao?: string | null;
};

function flagParaBoolean(valor: number | string | null | undefined): boolean {
	return valor === 1 || valor === "1";
}

function booleanParaFlag(valor: boolean): 0 | 1 {
	return valor ? 1 : 0;
}

export function serializarNaoConsiderarValorItem(marcado: boolean): "0" | "1" {
	return marcado ? "1" : "0";
}

export function parseNaoConsiderarValorItem(
	valor: string | null | undefined,
): boolean {
	return valor === "1";
}

export function resolverTipoConsignacao(params: {
	consignacao?: number | null;
	consignacaoentrada?: number | null;
}): TipoConsignacaoCfop {
	if (params.consignacaoentrada === 1) return "entrada";
	if (params.consignacao === 1) return "saida";
	return "nenhuma";
}

function asLiteralOrNull<T extends number>(
	valor: number | null | undefined,
	permitidos: readonly T[],
): T | null {
	if (valor == null) return null;
	return (permitidos as readonly number[]).includes(valor)
		? (valor as T)
		: null;
}

export function mapearTipoConsignacaoParaCampos(tipo: TipoConsignacaoCfop): {
	consignacao: 0 | 1;
	consignacaoentrada: 0 | 1;
} {
	if (tipo === "entrada") {
		return { consignacao: 0, consignacaoentrada: 1 };
	}
	if (tipo === "saida") {
		return { consignacao: 1, consignacaoentrada: 0 };
	}
	return { consignacao: 0, consignacaoentrada: 0 };
}

export function valoresIniciaisNaturezaForm(
	registro?: CfopApiRegistro | null,
): CfopFormData {
	return {
		codigo: registro?.codigo ?? "",
		descricao: registro?.descricao ?? "",
		tipoproduto: registro?.tipoproduto ?? null,
		ativo: registro?.inativa !== 1,
		consideravenda: flagParaBoolean(registro?.consideravenda),
		considerarservico: flagParaBoolean(registro?.considerarservico),
		digitarimpostositemnotasaida: flagParaBoolean(
			registro?.digitarimpostositemnotasaida,
		),
		calcularimpostoaproximado: flagParaBoolean(
			registro?.calcularimpostoaproximado,
		),
		possuiincentivosfiscais: flagParaBoolean(registro?.possuiincentivosfiscais),
		consideracustomedio: flagParaBoolean(registro?.consideracustomedio),
		informartotaismanualmente: flagParaBoolean(
			registro?.informartotaismanualmente,
		),
		permitenotasemvalor: flagParaBoolean(registro?.permitenotasemvalor),
		consumidorfinal: flagParaBoolean(registro?.consumidorfinal),
		permitirbaixarlotevencido: flagParaBoolean(
			registro?.permitirbaixarlotevencido,
		),
		naobaixarestoque: flagParaBoolean(registro?.naobaixarestoque),
		digitartotalitemmanualmente: flagParaBoolean(
			registro?.digitartotalitemmanualmente,
		),
		considerainscricaoestadualsub: flagParaBoolean(
			registro?.considerainscricaoestadualsub,
		),
		exigirdocumentoreferenciado: flagParaBoolean(
			registro?.exigirdocumentoreferenciado,
		),
		registrarproducaovenda: flagParaBoolean(registro?.registrarproducaovenda),
		considerarproduto: flagParaBoolean(registro?.considerarproduto),
		naoconsiderapiscofinsproduto: flagParaBoolean(
			registro?.naoconsiderapiscofinsproduto,
		),
		naoconsiderarvlnotafiscalitem: parseNaoConsiderarValorItem(
			registro?.naoconsiderarvlnotafiscalitem,
		),
		utilizartodasoperacoes: flagParaBoolean(registro?.utilizartodasoperacoes),
		interestadualdestmesmauf: flagParaBoolean(
			registro?.interestadualdestmesmauf,
		),
		tipoConsignacao: resolverTipoConsignacao({
			consignacao: registro?.consignacao,
			consignacaoentrada: registro?.consignacaoentrada,
		}),
		presencaconsumidor: asLiteralOrNull(registro?.presencaconsumidor, [
			0, 1, 2, 3, 5, 9,
		] as const),
		finalidadeemissaonfe: asLiteralOrNull(registro?.finalidadeemissaonfe, [
			1, 2, 3, 4, 5, 6, 7, 8, 9,
		] as const),
		tipovalorpreco: asLiteralOrNull(registro?.tipovalorpreco, [
			0, 1, 2, 3,
		] as const),
		integracao: asLiteralOrNull(registro?.integracao, [0, 1, 2] as const),
		idplanocontas: registro?.idplanocontas ?? null,
		idtipodocumentofinanceiro: registro?.idtipodocumentofinanceiro ?? null,
		idnaturezaoperacaoinversa: registro?.idnaturezaoperacaoinversa ?? null,
		idnaturezanaocontribuinte: registro?.idnaturezanaocontribuinte ?? null,
		idnaturezadevolucao: registro?.idnaturezadevolucao ?? null,
	};
}

function idOuNull(valor: string | null | undefined): string | null {
	if (!valor) return null;
	return valor;
}

export function mapearNaturezaFormParaApi(data: CfopFormData) {
	const consignacao = mapearTipoConsignacaoParaCampos(data.tipoConsignacao);

	return {
		codigo: data.codigo,
		descricao: data.descricao,
		tipoproduto: data.tipoproduto ?? null,
		inativa: booleanParaFlag(!data.ativo),
		consideravenda: booleanParaFlag(data.consideravenda),
		considerarservico: booleanParaFlag(data.considerarservico),
		digitarimpostositemnotasaida: booleanParaFlag(
			data.digitarimpostositemnotasaida,
		),
		calcularimpostoaproximado: booleanParaFlag(data.calcularimpostoaproximado),
		possuiincentivosfiscais: booleanParaFlag(data.possuiincentivosfiscais),
		consideracustomedio: booleanParaFlag(data.consideracustomedio),
		informartotaismanualmente: booleanParaFlag(data.informartotaismanualmente),
		permitenotasemvalor: booleanParaFlag(data.permitenotasemvalor),
		consumidorfinal: booleanParaFlag(data.consumidorfinal),
		permitirbaixarlotevencido: booleanParaFlag(data.permitirbaixarlotevencido),
		naobaixarestoque: booleanParaFlag(data.naobaixarestoque),
		digitartotalitemmanualmente: booleanParaFlag(
			data.digitartotalitemmanualmente,
		),
		considerainscricaoestadualsub: booleanParaFlag(
			data.considerainscricaoestadualsub,
		),
		exigirdocumentoreferenciado: booleanParaFlag(
			data.exigirdocumentoreferenciado,
		),
		registrarproducaovenda: booleanParaFlag(data.registrarproducaovenda),
		considerarproduto: booleanParaFlag(data.considerarproduto),
		naoconsiderapiscofinsproduto: booleanParaFlag(
			data.naoconsiderapiscofinsproduto,
		),
		naoconsiderarvlnotafiscalitem: serializarNaoConsiderarValorItem(
			data.naoconsiderarvlnotafiscalitem,
		),
		utilizartodasoperacoes: booleanParaFlag(data.utilizartodasoperacoes),
		interestadualdestmesmauf: booleanParaFlag(data.interestadualdestmesmauf),
		consignacao: consignacao.consignacao,
		consignacaoentrada: consignacao.consignacaoentrada,
		presencaconsumidor: data.presencaconsumidor ?? null,
		finalidadeemissaonfe: data.finalidadeemissaonfe ?? null,
		tipovalorpreco: data.tipovalorpreco ?? null,
		integracao: data.integracao ?? null,
		idplanocontas: idOuNull(data.idplanocontas),
		idtipodocumentofinanceiro: idOuNull(data.idtipodocumentofinanceiro),
		idnaturezaoperacaoinversa: idOuNull(data.idnaturezaoperacaoinversa),
		idnaturezanaocontribuinte: idOuNull(data.idnaturezanaocontribuinte),
		idnaturezadevolucao: idOuNull(data.idnaturezadevolucao),
	};
}
