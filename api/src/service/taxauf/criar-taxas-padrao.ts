import type { TaxaUf } from "@/model/taxauf-model.js";
import {
	criarTaxasUfEmLote,
	verificarEmpresaPossuiTaxas,
} from "@/repositories/taxauf-repositories.js";
import { montarTaxasPadrao } from "@/util/taxauf-padrao.js";

export async function criarTaxasPadraoService(
	idempresa: string,
): Promise<TaxaUf[]> {
	const possuiTaxas = await verificarEmpresaPossuiTaxas(idempresa);

	if (possuiTaxas) {
		return [];
	}

	const taxas = montarTaxasPadrao(idempresa);
	const taxasCriadas = await criarTaxasUfEmLote(taxas);

	if (taxasCriadas.length !== taxas.length) {
		throw new Error("Erro ao criar taxas padrão da empresa");
	}

	return taxasCriadas;
}
