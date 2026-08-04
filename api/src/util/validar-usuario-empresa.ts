import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";

/**
 * Valida se o usuário informado (quando presente) pertence à empresa.
 * Retorna mensagem de erro ou null quando válido.
 */
export async function validarUsuarioDaEmpresa(
	idusuario: string | null | undefined,
	idempresa: string,
	rotuloCampo = "Usuário",
): Promise<string | null> {
	if (!idusuario) return null;

	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) {
		return `${rotuloCampo} não pertence à empresa`;
	}

	return null;
}

/**
 * Valida vários usuários opcionais da empresa.
 * Retorna a primeira mensagem de erro encontrada ou null.
 */
export async function validarUsuariosDaEmpresa(
	campos: Array<{
		id: string | null | undefined;
		rotulo: string;
	}>,
	idempresa: string,
): Promise<string | null> {
	for (const campo of campos) {
		const erro = await validarUsuarioDaEmpresa(
			campo.id,
			idempresa,
			campo.rotulo,
		);
		if (erro) return erro;
	}
	return null;
}
