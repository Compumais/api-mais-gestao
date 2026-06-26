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
import type { NotaSintegra } from "../tipos-sintegra.js";

export function montarRegistro53(nota: NotaSintegra): string {
	return montarLinha([
		"53",
		formatarCnpjCpf(nota.cnpjCpf),
		formatarInscricaoEstadual(nota.inscricaoEstadual),
		formatarDataAaaammdd(nota.emissao),
		formatarAlfanumerico(nota.uf, 2),
		formatarNumerico(nota.modelo, 2),
		formatarSerie(nota.serie),
		formatarNumeroDocumento(nota.numero ?? nota.numeronotafiscal),
		formatarCfop(nota.cfopCodigo),
		nota.emitente,
		formatarDecimal(nota.baseIcmsSt, 13, 2),
		formatarDecimal(nota.valorIcmsSt, 13, 2),
		formatarDecimal("0", 13, 2),
		formatarDecimal("0", 13, 2),
		nota.situacao,
	]);
}
