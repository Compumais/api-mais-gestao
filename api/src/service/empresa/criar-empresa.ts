import type { Empresa } from "../../model/empresa-model";
import type { HttpResponse } from "../../model/http-model";
import type { Usuario } from "../../model/usuario-model";
import { criarBancosPadrao } from "../../repositories/banco-repositories";
import {
	criarEmpresa,
	type NovaEmpresa,
} from "../../repositories/empresa-repositories";
import {
	httpCriacao,
	httpLimiteExcedido,
	httpRecursoExistente,
} from "../../util/http-util";

type CriarEmpresaParametros = {
	dadosEmpresa: NovaEmpresa;
	proprietario: Usuario;
	quantidadeEmpresas: number;
};

export async function criarEmpresaService({
	dadosEmpresa,
	quantidadeEmpresas,
	proprietario,
}: CriarEmpresaParametros): Promise<HttpResponse<Empresa | null>> {
	if (
		proprietario.maxempresas &&
		quantidadeEmpresas >= proprietario.maxempresas
	) {
		return httpLimiteExcedido();
	}

	const [empresa] = await criarEmpresa(dadosEmpresa);

	if (!empresa) {
		return httpRecursoExistente();
	}

	// Criar bancos padrão para a nova empresa
	try {
		await criarBancosPadrao(empresa.id);
	} catch (error) {
		console.error("Erro ao criar bancos padrão:", error);
		// Não falha a criação da empresa se os bancos padrão não forem criados
		// A empresa já foi criada com sucesso
	}

	return httpCriacao<Empresa>(empresa);
}
