import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function obterChaveCriptografia(): Buffer {
	const chaveBase64 = process.env.NFE_CERT_ENCRYPTION_KEY;
	if (!chaveBase64) {
		throw new Error("NFE_CERT_ENCRYPTION_KEY não configurada");
	}

	const chave = Buffer.from(chaveBase64, "base64");
	if (chave.length !== 32) {
		throw new Error("NFE_CERT_ENCRYPTION_KEY deve ter 32 bytes em base64");
	}

	return chave;
}

export function criptografarTexto(texto: string): string {
	const chave = obterChaveCriptografia();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITMO, chave, iv);
	const criptografado = Buffer.concat([
		cipher.update(texto, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([iv, tag, criptografado]).toString("base64");
}

export function descriptografarTexto(payload: string): string {
	const chave = obterChaveCriptografia();
	const buffer = Buffer.from(payload, "base64");
	const iv = buffer.subarray(0, IV_LENGTH);
	const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
	const dados = buffer.subarray(IV_LENGTH + TAG_LENGTH);

	const decipher = createDecipheriv(ALGORITMO, chave, iv);
	decipher.setAuthTag(tag);

	return Buffer.concat([decipher.update(dados), decipher.final()]).toString(
		"utf8",
	);
}

export function gerarThumbprint(conteudo: Buffer): string {
	return createHash("sha256").update(conteudo).digest("hex");
}

export function normalizarCnpj(cnpj: string): string {
	return cnpj.replace(/\D/g, "");
}
