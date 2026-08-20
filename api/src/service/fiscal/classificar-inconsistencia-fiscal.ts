import type {
	ClassificacaoFinalFiscal,
	TipoInconsistenciaFiscal,
	ValidacaoFiscalItem,
} from "@/model/regra-fiscal-model.js";

export function classificarInconsistenciaFiscal(
	validacoes: ValidacaoFiscalItem[],
): TipoInconsistenciaFiscal | null {
	const tipos = validacoes
		.map((item) => item.tipoInconsistencia)
		.filter((tipo): tipo is TipoInconsistenciaFiscal => Boolean(tipo));

	if (tipos.includes("BUG_DE_SISTEMA")) return "BUG_DE_SISTEMA";
	if (tipos.includes("ERRO_DE_PARAMETRIZACAO_FISCAL")) {
		return "ERRO_DE_PARAMETRIZACAO_FISCAL";
	}
	if (tipos.includes("ERRO_DE_CADASTRO")) return "ERRO_DE_CADASTRO";
	if (tipos.includes("ALTERACAO_LEGISLATIVA")) return "ALTERACAO_LEGISLATIVA";
	if (tipos.includes("REGRA_FISCAL_INDETERMINADA")) {
		return "REGRA_FISCAL_INDETERMINADA";
	}
	return null;
}

export function classificacaoFinalFiscal(params: {
	validacoes: ValidacaoFiscalItem[];
	stConfirmada: boolean;
	difalConfirmado: boolean;
	exigeSt: boolean;
	exigeDifal: boolean;
}): ClassificacaoFinalFiscal {
	const temInconsistencia = params.validacoes.some(
		(item) => item.status === "INCONSISTENCIA",
	);
	const tipo = classificarInconsistenciaFiscal(params.validacoes);

	if (tipo === "BUG_DE_SISTEMA") return "BUG_DE_SISTEMA";
	if (tipo === "ALTERACAO_LEGISLATIVA") return "ALTERACAO_LEGISLATIVA_DETECTADA";
	if (temInconsistencia) {
		if (tipo === "ERRO_DE_CADASTRO" || tipo === "ERRO_DE_PARAMETRIZACAO_FISCAL") {
			return "ERRO_DE_CONFIGURACAO";
		}
		return "REVISAO_FISCAL_NECESSARIA";
	}

	if ((params.exigeSt && !params.stConfirmada) || (params.exigeDifal && !params.difalConfirmado)) {
		return "REGRA_FISCAL_NAO_CONFIRMADA";
	}

	const temAlerta = params.validacoes.some((item) => item.status === "ATENCAO");
	return temAlerta ? "VALIDADO_COM_ALERTAS" : "VALIDADO";
}
