import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITMO = "aes-256-gcm";
/** Nonce de 96 bits recomendado para GCM. */
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class CnabEncryptionService {
	private readonly key: Buffer;

	constructor() {
		const keyHex = process.env.CNAB_ENCRYPTION_KEY;
		if (!keyHex) {
			throw new Error("CNAB_ENCRYPTION_KEY env variable is required");
		}
		this.key = Buffer.from(keyHex, "hex");
		if (this.key.length !== 32) {
			throw new Error(
				"CNAB_ENCRYPTION_KEY must be 32 bytes (64 hex chars) for aes-256-gcm",
			);
		}
	}

	/** Formato gravado: iv + tag + ciphertext. */
	encrypt(plain: Buffer): Buffer {
		const iv = randomBytes(IV_LENGTH);
		const cipher = createCipheriv(ALGORITMO, this.key, iv);
		const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
		const tag = cipher.getAuthTag();
		return Buffer.concat([iv, tag, encrypted]);
	}

	decrypt(data: Buffer): Buffer {
		const iv = data.subarray(0, IV_LENGTH);
		const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
		const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
		const decipher = createDecipheriv(ALGORITMO, this.key, iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(encrypted), decipher.final()]);
	}
}
