import {
	criarPlanoContas,
	type NovoPlanoContas,
} from "../../repositories/plano-contas-model";

export async function criarPlanoContasService(
	dadosPlanoContas: NovoPlanoContas,
) {
	const planoContas = await criarPlanoContas(dadosPlanoContas);

	if (!planoContas) {
		throw new Error("Erro ao criar plano de contas");
	}

	return planoContas;
}
