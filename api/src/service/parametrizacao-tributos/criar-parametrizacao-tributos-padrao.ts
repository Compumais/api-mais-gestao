import type { ParametrizacaoTributos } from "@/repositories/parametrizacao-tributos-repositories.js";
import {
	criarParametrizacaoTributosEmLote,
	verificarEmpresaPossuiParametrizacaoTributos,
} from "@/repositories/parametrizacao-tributos-repositories.js";
import { montarParametrizacaoTributosPadrao } from "@/util/parametrizacao-tributos-padrao.js";

export async function criarParametrizacaoTributosPadraoService(
	idempresa: string,
): Promise<ParametrizacaoTributos[]> {
	const possuiParametrizacao =
		await verificarEmpresaPossuiParametrizacaoTributos(idempresa);

	if (possuiParametrizacao) {
		return [];
	}

	const registros = await montarParametrizacaoTributosPadrao(idempresa);

	if (registros.length === 0) {
		return [];
	}

	const criados = await criarParametrizacaoTributosEmLote(registros);

	if (criados.length !== registros.length) {
		throw new Error("Erro ao criar parametrização tributária padrão da empresa");
	}

	return criados;
}
