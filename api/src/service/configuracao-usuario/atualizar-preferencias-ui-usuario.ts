import type { HttpResponse } from "@/model/http-model.js";
import {
	criarOuAtualizarPreferenciasUiUsuario,
	type PreferenciasUiUsuario,
} from "@/repositories/configuracao-usuario-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

type AtualizarPreferenciasUiUsuarioParametros = {
	idusuario: string;
	dados: PreferenciasUiUsuario;
};

export async function atualizarPreferenciasUiUsuarioService({
	idusuario,
	dados,
}: AtualizarPreferenciasUiUsuarioParametros): Promise<
	HttpResponse<PreferenciasUiUsuario>
> {
	const configuracao = await criarOuAtualizarPreferenciasUiUsuario(
		idusuario,
		dados,
	);

	if (!configuracao) {
		return httpNaoEncontrado();
	}

	return httpOk<PreferenciasUiUsuario>(
		configuracao.preferenciasui ?? { colunasTabelas: {} },
	);
}
