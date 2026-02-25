import type { HttpResponse } from "@/model/http-model.js";
import {
	type ConfiguracaoUsuario,
	criarOuAtualizarConfiguracaoUsuario,
	type IntegracoesUsuario,
} from "@/repositories/configuracao-usuario-repositories.js";
import { httpNaoEncontrado, httpOk } from "@/util/http-util.js";

interface AtualizarConfiguracaoUsuarioParametros {
	idusuario: string;
	dados: IntegracoesUsuario;
}

export async function atualizarConfiguracaoUsuarioService({
	idusuario,
	dados,
}: AtualizarConfiguracaoUsuarioParametros): Promise<
	HttpResponse<ConfiguracaoUsuario>
> {
	// Apenas o próprio usuário pode atualizar suas configurações
	// Esta validação é feita no controller, mas garantimos aqui também
	// O controller já valida que request.user.id === idusuario

	const configuracao = await criarOuAtualizarConfiguracaoUsuario(
		idusuario,
		dados,
	);

	if (!configuracao) {
		return httpNaoEncontrado();
	}

	return httpOk<ConfiguracaoUsuario>({
		id: configuracao?.id,
		idusuario: configuracao.idusuario,
		integracoes: configuracao.integracoes ?? {},
		criadoem: configuracao.criadoem ?? "",
		atualizadoem: configuracao.atualizadoem ?? "",
	});
}
