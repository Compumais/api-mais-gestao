import {
	formatarAlfanumerico,
	formatarCfop,
	formatarCnpjCpf,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarInscricaoEstadual,
	formatarNumeroDocumento,
	formatarNumerico,
	formatarSerie,
	montarLinha,
} from "../formatador-campo.js";
import type { AgrupamentoRegistro50 } from "../tipos-sintegra.js";

export function montarRegistro50(agrupamento: AgrupamentoRegistro50): string {
	const { nota } = agrupamento;
	const cancelada = nota.situacao === "S" || nota.situacao === "X";

	if (cancelada) {
		return montarLinha([
			"50",
			formatarCnpjCpf(nota.cnpjCpf),
			formatarInscricaoEstadual(nota.inscricaoEstadual),
			formatarDataAaaammdd(nota.emissao),
			formatarAlfanumerico(nota.uf, 2),
			formatarNumerico(nota.modelo, 2),
			formatarSerie(nota.serie),
			formatarNumeroDocumento(nota.numero ?? nota.numeronotafiscal),
			formatarCfop(agrupamento.cfop),
			nota.emitente,
			formatarDecimal("0", 13, 2),
			formatarDecimal("0", 13, 2),
			formatarDecimal("0", 13, 2),
			formatarDecimal("0", 13, 2),
			formatarDecimal("0", 13, 2),
			formatarDecimal("0", 4, 2),
			nota.situacao,
		]);
	}

	return montarLinha([
		"50",
		formatarCnpjCpf(nota.cnpjCpf),
		formatarInscricaoEstadual(nota.inscricaoEstadual),
		formatarDataAaaammdd(nota.emissao),
		formatarAlfanumerico(nota.uf, 2),
		formatarNumerico(nota.modelo, 2),
		formatarSerie(nota.serie),
		formatarNumeroDocumento(nota.numero ?? nota.numeronotafiscal),
		formatarCfop(agrupamento.cfop),
		nota.emitente,
		formatarDecimal(agrupamento.valorTotal, 13, 2),
		formatarDecimal(agrupamento.baseIcms, 13, 2),
		formatarDecimal(agrupamento.valorIcms, 13, 2),
		formatarDecimal(agrupamento.valorIsento, 13, 2),
		formatarDecimal(agrupamento.valorOutras, 13, 2),
		formatarDecimal(agrupamento.aliquota, 4, 2),
		nota.situacao,
	]);
}
