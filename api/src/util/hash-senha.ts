import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashSenha(senha: string): Promise<string> {
	return bcrypt.hash(senha, SALT_ROUNDS);
}
