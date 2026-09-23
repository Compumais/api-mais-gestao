import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

/** Parâmetros alinhados ao Better Auth (`@better-auth/utils/password`). */
const SCRYPT = {
	N: 16384,
	r: 16,
	p: 1,
	dkLen: 64,
	maxmem: 128 * 16384 * 16 * 2,
} as const;

function scryptAsync(
	password: string,
	salt: string,
	keylen: number,
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scryptCallback(
			password,
			salt,
			keylen,
			{
				N: SCRYPT.N,
				r: SCRYPT.r,
				p: SCRYPT.p,
				maxmem: SCRYPT.maxmem,
			},
			(err, derived) => {
				if (err) reject(err);
				else resolve(derived as Buffer);
			},
		);
	});
}

/**
 * Verifica senha contra hash Better Auth (`saltHex:keyHex`).
 * O salt passado ao scrypt é a string hex (UTF-8), igual ao Better Auth.
 */
export async function verificarSenhaUsuario(
	senha: string,
	hash: string | null | undefined,
): Promise<boolean> {
	if (!hash?.trim() || !senha) return false;
	const [salt, keyHex] = hash.split(":");
	if (!salt || !keyHex) return false;
	try {
		const derivado = await scryptAsync(
			senha.normalize("NFKC"),
			salt,
			SCRYPT.dkLen,
		);
		const esperado = Buffer.from(keyHex, "hex");
		if (derivado.length !== esperado.length) return false;
		return timingSafeEqual(derivado, esperado);
	} catch {
		return false;
	}
}

/**
 * Gera hash no formato Better Auth (só se a API enviar senha em claro).
 * Preferir sempre o hash já existente em `contas.password`.
 */
export async function hashSenhaUsuario(senha: string): Promise<string> {
	const salt = randomBytes(16).toString("hex");
	const derivado = await scryptAsync(
		senha.normalize("NFKC"),
		salt,
		SCRYPT.dkLen,
	);
	return `${salt}:${derivado.toString("hex")}`;
}
