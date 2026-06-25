import type { TipoDocumentoFinanceiro } from "@/model/tipo-documento-financeiro-model.js";
import {
	criarTiposDocumentoFinanceiroEmLote,
	verificarEmpresaPossuiTiposDocumentoFinanceiro,
} from "@/repositories/tipo-documento-financeiro-repositories.js";
import { montarTiposDocumentoFinanceiroPadrao } from "@/util/tipos-documento-financeiro-padrao.js";

export async function criarTiposDocumentoFinanceiroPadraoService(
	idempresa: string,
): Promise<TipoDocumentoFinanceiro[]> {
	const possuiRegistros =
		await verificarEmpresaPossuiTiposDocumentoFinanceiro(idempresa);

	if (possuiRegistros) {
		return [];
	}

	const registros = montarTiposDocumentoFinanceiroPadrao(idempresa);
	const criados = await criarTiposDocumentoFinanceiroEmLote(registros);

	if (criados.length !== registros.length) {
		throw new Error("Erro ao criar formas de pagamento padrão da empresa");
	}

	return criados;
}
