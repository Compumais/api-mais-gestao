import {
	campoDataDdmmaaaa,
	campoDecimal,
	campoNumerico,
	campoTexto,
	formatarCstIcmsEfd,
	montarLinhaPipe,
	parseNumeroEfd,
} from "@/util/efd/formatador-pipe.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import type { ItemEfd, NotaEfd } from "../tipos-efd-icms.js";

export function codigoSituacaoDocumento(nota: NotaEfd): string {
	if (nota.status === NFE_STATUS.INUTILIZADA) return "05";
	if (nota.status === NFE_STATUS.DENEGADA) return "04";
	if (
		nota.cancelada ||
		nota.status === NFE_STATUS.CANCELADA ||
		nota.status === NFE_STATUS.CANCELADA_FORA_PRAZO
	) {
		return "02";
	}
	return "00";
}

export function montarRegistroC001(indMov: "0" | "1"): string {
	return montarLinhaPipe(["C001", indMov]);
}

export function montarRegistroC100(
	nota: NotaEfd,
	incluirValores: boolean,
): string {
	const indOper = nota.tipoorigem === 0 ? "0" : "1";
	const indEmit = nota.tipoorigem === 0 ? "1" : "0";
	const modelo = campoNumerico(nota.modelo).padStart(2, "0").slice(-2);
	const situacao = codigoSituacaoDocumento(nota);
	const valoresZerados =
		situacao === "02" || situacao === "04" || situacao === "05";
	const usarValores = incluirValores && !valoresZerados;

	return montarLinhaPipe([
		"C100",
		indOper,
		indEmit,
		modelo === "65" ? "" : campoTexto(nota.codigoParticipante, 60),
		modelo,
		situacao,
		campoTexto(nota.serie, 3),
		campoNumerico(nota.numero).slice(-9),
		campoNumerico(nota.chave).slice(-44),
		campoDataDdmmaaaa(nota.emissao),
		campoDataDdmmaaaa(nota.dataEntradaSaida ?? nota.emissao),
		usarValores ? campoDecimal(nota.valorDocumento) : "0,00",
		"0",
		usarValores ? campoDecimal(nota.desconto) : "0,00",
		"0,00",
		usarValores
			? campoDecimal(nota.valorMercadoria ?? nota.valorDocumento)
			: "0,00",
		String(nota.indFrete ?? 9),
		usarValores ? campoDecimal(nota.frete) : "0,00",
		usarValores ? campoDecimal(nota.seguro) : "0,00",
		usarValores ? campoDecimal(nota.outrasDespesas) : "0,00",
		usarValores ? campoDecimal(nota.baseIcms) : "0,00",
		usarValores ? campoDecimal(nota.valorIcms) : "0,00",
		usarValores ? campoDecimal(nota.baseIcmsSt) : "0,00",
		usarValores ? campoDecimal(nota.valorIcmsSt) : "0,00",
		usarValores ? campoDecimal(nota.valorIpi) : "0,00",
		usarValores ? campoDecimal(nota.valorPis) : "0,00",
		usarValores ? campoDecimal(nota.valorCofins) : "0,00",
		"0,00",
		"0,00",
	]);
}

export function montarRegistroC170(item: ItemEfd, numeroItem: number): string {
	const cstIcms = formatarCstIcmsEfd(item.origem, item.cstIcms, item.csosn);
	const cfop = campoNumerico(item.cfop).padStart(4, "0").slice(-4);
	return montarLinhaPipe([
		"C170",
		String(numeroItem),
		campoTexto(item.codigoProduto, 60),
		campoTexto(item.descricao, 120),
		campoDecimal(item.quantidade, 5),
		campoTexto(item.unidade ?? "UN", 6),
		campoDecimal(item.valorItem),
		campoDecimal(item.desconto),
		"0",
		cstIcms,
		cfop,
		"",
		campoDecimal(item.baseIcms),
		campoDecimal(item.aliquotaIcms),
		campoDecimal(item.valorIcms),
		campoDecimal(item.baseIcmsSt),
		campoDecimal(item.aliquotaIcmsSt),
		campoDecimal(item.valorIcmsSt),
		"0",
		campoTexto(item.cstIpi, 2),
		"",
		"0,00",
		"0,00",
		campoDecimal(item.valorIpi),
		campoTexto(item.cstPis, 2),
		campoDecimal(item.basePis),
		campoDecimal(item.aliquotaPis, 4),
		"",
		campoDecimal(item.valorPis),
		campoTexto(item.cstCofins, 2),
		campoDecimal(item.baseCofins),
		campoDecimal(item.aliquotaCofins, 4),
		"",
		campoDecimal(item.valorCofins),
		"",
		"0,00",
	]);
}

export type AgrupamentoC190 = {
	cstIcms: string;
	cfop: string;
	aliquota: string;
	valorOperacao: number;
	baseIcms: number;
	valorIcms: number;
	baseIcmsSt: number;
	valorIcmsSt: number;
	valorIpi: number;
};

export function agruparItensC190(itens: ItemEfd[]): AgrupamentoC190[] {
	const mapa = new Map<string, AgrupamentoC190>();
	for (const item of itens) {
		const cstIcms = formatarCstIcmsEfd(item.origem, item.cstIcms, item.csosn);
		const cfop = campoNumerico(item.cfop).padStart(4, "0").slice(-4);
		const aliquota = parseNumeroEfd(item.aliquotaIcms).toFixed(2);
		const chave = `${cstIcms}|${cfop}|${aliquota}`;
		const atual = mapa.get(chave) ?? {
			cstIcms,
			cfop,
			aliquota,
			valorOperacao: 0,
			baseIcms: 0,
			valorIcms: 0,
			baseIcmsSt: 0,
			valorIcmsSt: 0,
			valorIpi: 0,
		};
		atual.valorOperacao += parseNumeroEfd(item.valorItem);
		atual.baseIcms += parseNumeroEfd(item.baseIcms);
		atual.valorIcms += parseNumeroEfd(item.valorIcms);
		atual.baseIcmsSt += parseNumeroEfd(item.baseIcmsSt);
		atual.valorIcmsSt += parseNumeroEfd(item.valorIcmsSt);
		atual.valorIpi += parseNumeroEfd(item.valorIpi);
		mapa.set(chave, atual);
	}
	return [...mapa.values()];
}

export function montarRegistroC190(grupo: AgrupamentoC190): string {
	return montarLinhaPipe([
		"C190",
		grupo.cstIcms,
		grupo.cfop,
		campoDecimal(grupo.aliquota),
		campoDecimal(grupo.valorOperacao),
		campoDecimal(grupo.baseIcms),
		campoDecimal(grupo.valorIcms),
		campoDecimal(grupo.baseIcmsSt),
		campoDecimal(grupo.valorIcmsSt),
		"0,00",
		campoDecimal(grupo.valorIpi),
		"",
	]);
}

export function conferirC190IgualC170(
	itens: ItemEfd[],
	grupos: AgrupamentoC190[],
	tolerancia = 0.01,
): string[] {
	const somaItens = itens.reduce(
		(acc, item) => ({
			opr: acc.opr + parseNumeroEfd(item.valorItem),
			bc: acc.bc + parseNumeroEfd(item.baseIcms),
			icms: acc.icms + parseNumeroEfd(item.valorIcms),
			st: acc.st + parseNumeroEfd(item.valorIcmsSt),
		}),
		{ opr: 0, bc: 0, icms: 0, st: 0 },
	);
	const somaGrupos = grupos.reduce(
		(acc, grupo) => ({
			opr: acc.opr + grupo.valorOperacao,
			bc: acc.bc + grupo.baseIcms,
			icms: acc.icms + grupo.valorIcms,
			st: acc.st + grupo.valorIcmsSt,
		}),
		{ opr: 0, bc: 0, icms: 0, st: 0 },
	);
	const alertas: string[] = [];
	if (Math.abs(somaItens.opr - somaGrupos.opr) > tolerancia) {
		alertas.push("C190 diverge do C170 no valor da operação.");
	}
	if (Math.abs(somaItens.icms - somaGrupos.icms) > tolerancia) {
		alertas.push("C190 diverge do C170 no valor do ICMS.");
	}
	if (Math.abs(somaItens.st - somaGrupos.st) > tolerancia) {
		alertas.push("C190 diverge do C170 no valor do ICMS ST.");
	}
	return alertas;
}

export function montarRegistroC990(qtdLinhas: number): string {
	return montarLinhaPipe(["C990", String(qtdLinhas)]);
}
