import {
	formatarAlfanumerico,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarNumerico,
	formatarNumeroDocumento,
	formatarSerie,
	montarLinha,
} from "../formatador-campo.js";
import type { ResumoNfceDiarioSintegra } from "../tipos-sintegra.js";

export function montarRegistro61(resumo: ResumoNfceDiarioSintegra): string {
	return montarLinha([
		"61",
		formatarAlfanumerico("", 14),
		formatarAlfanumerico("", 14),
		formatarDataAaaammdd(resumo.data),
		formatarNumerico(resumo.modelo, 2),
		// Item 17.1.3.1 do Convênio 57/95: no registro 61 a série numérica
		// (001) é rejeitada. NFC-e (modelo 65) entra como série D.
		resumo.modelo === "65" ? formatarSerie("D") : formatarSerie(resumo.serie),
		formatarAlfanumerico("", 2),
		formatarNumeroDocumento(resumo.numeroInicial),
		formatarNumeroDocumento(resumo.numeroFinal),
		formatarDecimal(resumo.valorTotal, 13, 2),
		formatarDecimal(resumo.baseIcms, 13, 2),
		formatarDecimal(resumo.valorIcms, 12, 2),
		formatarDecimal(resumo.valorIsento, 13, 2),
		formatarDecimal(resumo.valorOutras, 13, 2),
		formatarDecimal(resumo.aliquota, 4, 2),
		" ",
	]);
}
