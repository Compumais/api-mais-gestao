import {
	formatarAlfanumerico,
	formatarCfop,
	formatarCnpjCpf,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarInscricaoEstadual,
	formatarNumeroDocumento,
	formatarSerie,
	montarLinha,
} from "../formatador-campo.js";
import type { NotaSintegra } from "../tipos-sintegra.js";

export function montarRegistro51(nota: NotaSintegra, valorIpi: number): string {
	const cancelada = nota.situacao === "S" || nota.situacao === "X";

	return montarLinha([
		"51",
		formatarCnpjCpf(nota.cnpjCpf),
		formatarInscricaoEstadual(nota.inscricaoEstadual),
		formatarDataAaaammdd(nota.emissao),
		formatarAlfanumerico(nota.uf, 2),
		formatarSerie(nota.serie),
		formatarNumeroDocumento(nota.numero ?? nota.numeronotafiscal),
		formatarCfop(nota.cfopCodigo),
		formatarDecimal(cancelada ? 0 : nota.valorTotal, 13, 2),
		formatarDecimal(cancelada ? 0 : valorIpi, 13, 2),
		formatarDecimal("0", 13, 2),
		formatarDecimal("0", 13, 2),
		formatarAlfanumerico("", 20),
		nota.situacao,
	]);
}
