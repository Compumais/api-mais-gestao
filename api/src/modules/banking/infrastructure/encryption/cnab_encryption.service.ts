import crypto, { type CipherGCM, type DecipherGCM } from "node:crypto";

export class CnabEncryptionService {
  private algorithm = "aes-256-gcm";
  private key: Buffer;

  constructor() {
    const keyHex = process.env.CNAB_ENCRYPTION_KEY;
    if (!keyHex) {
      throw new Error("CNAB_ENCRYPTION_KEY env variable is required");
    }
    this.key = Buffer.from(keyHex, "hex");
    if (this.key.length !== 32) {
      throw new Error("CNAB_ENCRYPTION_KEY must be 32 bytes (64 hex chars) for aes-256-gcm");
    }
  }

  encrypt(plain: Buffer): Buffer {
    const iv = crypto.randomBytes(12); // 96‑bit nonce for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as unknown as CipherGCM;
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Store iv + tag + ciphertext
    return Buffer.concat([iv, tag, encrypted]);
  }

  decrypt(data: Buffer): Buffer {
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as unknown as DecipherGCM;
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
