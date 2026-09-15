import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarConfiguracaoUsuario,
	type PreferenciasUiUsuario,
} from "@/repositories/configuracao-usuario-repositories.js";
import { httpOk } from "@/util/http-util.js";

type BuscarPreferenciasUiUsuarioParametros = {
	idusuario: string;
};

export async function buscarPreferenciasUiUsuarioService({
	idusuario,
}: BuscarPreferenciasUiUsuarioParametros): Promise<
	HttpResponse<PreferenciasUiUsuario>
> {
	const configuracao = await buscarConfiguracaoUsuario(idusuario);

	return httpOk<PreferenciasUiUsuario>(
		configuracao?.preferenciasui ?? { colunasTabelas: {} },
	);
}
