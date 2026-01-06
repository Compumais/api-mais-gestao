import type { Usuario } from "../../model/usuario-model";
import {
	criarEmpresa,
	type NovaEmpresa,
} from "../../repositories/empresa-model";
import {
	httpCriacao,
	httpLimiteExcedido, 
	httpRecursoExistente
} from "../../util/http-util";
import type { Empresa } from "../../model/empresa-model";
import type { HttpResponse } from "../../model/http-model";

type CriarEmpresaParametros = {
	dadosEmpresa: NovaEmpresa
	proprietario: Usuario
	quantidadeEmpresas: number
}

export async function criarEmpresaService({
	dadosEmpresa,
	quantidadeEmpresas,
	proprietario,
}: CriarEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	if (proprietario.maxCompanies && proprietario.maxCompanies >= quantidadeEmpresas) {
		return httpLimiteExcedido();
	}

	const [empresa] = await criarEmpresa(dadosEmpresa);

	if (!empresa) {
		return httpRecursoExistente();
	}

	return httpCriacao<Empresa>(empresa);
}
