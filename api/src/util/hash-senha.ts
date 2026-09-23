import { auth } from "@/lib/auth.js";

type ContextoSenhaAuth = {
	password: {
		hash: (senha: string) => Promise<string>;
		verify: (dados: { hash: string; password: string }) => Promise<boolean>;
	};
};

async function obterContextoSenha(): Promise<ContextoSenhaAuth["password"]> {
	const contexto = await (
		auth as unknown as { $context: Promise<ContextoSenhaAuth> }
	).$context;
	return contexto.password;
}

export async function hashSenha(senha: string): Promise<string> {
	const password = await obterContextoSenha();
	return password.hash(senha);
}

/** Verifica senha no mesmo esquema do Better Auth (scrypt). */
export async function verificarSenha(
	senha: string,
	hash: string,
): Promise<boolean> {
	if (!hash?.trim() || !senha) return false;
	const password = await obterContextoSenha();
	return password.verify({ hash, password: senha });
}
