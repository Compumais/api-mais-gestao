import type { CFOP } from "@/model/cfop-model.js";
import {
	criarCfopsEmLote,
	verificarEmpresaPossuiCfops,
} from "@/repositories/cfop-repositories.js";
import { montarCfopsPadrao } from "@/util/cfop-padrao.js";

export async function criarCfopsPadraoService(
	idempresa: string,
): Promise<CFOP[]> {
	const possuiCfops = await verificarEmpresaPossuiCfops(idempresa);

	if (possuiCfops) {
		return [];
	}

	const cfops = montarCfopsPadrao(idempresa);
	const cfopsCriados = await criarCfopsEmLote(cfops);

	if (cfopsCriados.length !== cfops.length) {
		throw new Error("Erro ao criar CFOPs padrão da empresa");
	}

	return cfopsCriados;
}
