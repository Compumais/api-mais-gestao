import {
	formatarAlfanumerico,
	formatarCfop,
	formatarCnpjCpf,
	formatarDataAaaammdd,
	formatarDecimal,
	formatarInscricaoEstadual,
	formatarNumerico,
	formatarNumeroDocumento,
	formatarSerie,
	montarLinha,
} from "../formatador-campo.js";
import type { NotaSintegra } from "../tipos-sintegra.js";

export type MontarRegistro53Overrides = {
	cfop?: string;
	baseIcmsSt?: number | string | null;
	valorIcmsSt?: number | string | null;
};

export function montarRegistro53(
	nota: NotaSintegra,
	overrides?: MontarRegistro53Overrides,
): string {
	const cfop = overrides?.cfop ?? nota.cfopCodigo;
	const baseIcmsSt = overrides?.baseIcmsSt ?? nota.baseIcmsSt;
	const valorIcmsSt = overrides?.valorIcmsSt ?? nota.valorIcmsSt;

	return montarLinha([
		"53",
		formatarCnpjCpf(nota.cnpjCpf),
		formatarInscricaoEstadual(nota.inscricaoEstadual),
		formatarDataAaaammdd(nota.dataCompetencia ?? nota.emissao),
		formatarAlfanumerico(nota.uf, 2),
		formatarNumerico(nota.modelo, 2),
		formatarSerie(nota.serie),
		formatarNumeroDocumento(nota.numero ?? nota.numeronotafiscal),
		formatarCfop(cfop),
		nota.emitente,
		formatarDecimal(baseIcmsSt, 13, 2),
		formatarDecimal(valorIcmsSt, 13, 2),
		formatarDecimal("0", 13, 2),
		nota.situacao,
		" ",
	]);
}
