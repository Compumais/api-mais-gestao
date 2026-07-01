import { v4 as uuidv4 } from "uuid";
import type { FatorConversao } from "@/model/fator-conversao-model.js";
import {
	criarFatorConversao,
	verificarEmpresaPossuiFatoresConversao,
} from "@/repositories/fator-conversao-repositories.js";

export async function criarFatoresConversaoPadraoService(
	idempresa: string,
): Promise<FatorConversao[]> {
	const possuiFatores = await verificarEmpresaPossuiFatoresConversao(idempresa);

	if (possuiFatores) {
		return [];
	}

	const fatorPadrao = await criarFatorConversao({
		id: uuidv4(),
		idempresa,
		nome: "Padrão (1:1)",
		fator: "1.000000",
		currenttimemillis: Date.now(),
	});

	if (!fatorPadrao) {
		throw new Error("Erro ao criar fator de conversão padrão da empresa");
	}

	return [fatorPadrao];
}
