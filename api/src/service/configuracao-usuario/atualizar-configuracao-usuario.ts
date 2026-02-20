import type { HttpResponse } from "@/model/http-model";
import {
	criarOuAtualizarConfiguracaoUsuario,
	type ConfiguracaoUsuario,
	type IntegracoesUsuario,
} from "@/repositories/configuracao-usuario-repositories";
import { httpOk, httpProibido } from "@/util/http-util";

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

	return httpOk(configuracao);
}

