import type { BandeiraCartao } from "@/model/bandeira-cartao-model.js";
import {
	criarBandeirasCartaoEmLote,
	verificarEmpresaPossuiBandeirasCartao,
} from "@/repositories/bandeira-cartao-repositories.js";
import { montarBandeirasCartaoPadrao } from "@/util/bandeiras-cartao-padrao.js";

export async function criarBandeirasCartaoPadraoService(
	idempresa: string,
): Promise<BandeiraCartao[]> {
	const possuiRegistros =
		await verificarEmpresaPossuiBandeirasCartao(idempresa);

	if (possuiRegistros) {
		return [];
	}

	const registros = montarBandeirasCartaoPadrao(idempresa);
	const criados = await criarBandeirasCartaoEmLote(registros);

	if (criados.length !== registros.length) {
		throw new Error("Erro ao criar bandeiras de cartão padrão da empresa");
	}

	return criados;
}
