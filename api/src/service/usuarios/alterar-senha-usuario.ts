import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarOuCriarSenhaContaUsuario,
	buscarUsuarioPorId,
	inativarSessoesUsuario,
} from "@/repositories/usuarios-repositories.js";
import { hashSenha } from "@/util/hash-senha.js";
import {
	httpErroInterno,
	httpNaoEncontrado,
	httpOk,
} from "@/util/http-util.js";

export async function alterarSenhaUsuarioService({
	id,
	novaSenha,
}: {
	id: string;
	novaSenha: string;
}): Promise<HttpResponse<{ sucesso: true }>> {
	const usuario = await buscarUsuarioPorId(id);
	if (!usuario) {
		return httpNaoEncontrado("Usuário não encontrado");
	}

	try {
		const senhaHash = await hashSenha(novaSenha);
		await atualizarOuCriarSenhaContaUsuario(id, senhaHash);
		await inativarSessoesUsuario(id);
		return httpOk({ sucesso: true });
	} catch (error) {
		console.error("Erro ao alterar senha do usuário:", error);
		return httpErroInterno();
	}
}
