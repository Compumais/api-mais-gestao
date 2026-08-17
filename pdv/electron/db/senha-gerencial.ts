import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashSenhaGerencial(
	senha: string,
	saltExistente?: string,
): { salt: string; hash: string } {
	const texto = senha.trim();
	if (texto.length < 4) {
		throw new Error("A senha gerencial precisa ter ao menos 4 caracteres");
	}
	const salt = saltExistente?.trim() || randomBytes(16).toString("hex");
	const hash = createHash("sha256").update(`${salt}:${texto}`).digest("hex");
	return { salt, hash };
}

export function senhaGerencialConfere(
	senha: string,
	salt: string,
	hash: string,
): boolean {
	if (!salt || !hash) return false;
	const calc = createHash("sha256")
		.update(`${salt}:${senha.trim()}`)
		.digest("hex");
	const a = Buffer.from(calc, "hex");
	const b = Buffer.from(hash, "hex");
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
