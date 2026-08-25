import { auth } from "@/lib/auth.js";

type ContextoSenhaAuth = {
	password: {
		hash: (senha: string) => Promise<string>;
	};
};

export async function hashSenha(senha: string): Promise<string> {
	const contexto = await (
		auth as unknown as { $context: Promise<ContextoSenhaAuth> }
	).$context;
	return contexto.password.hash(senha);
}
