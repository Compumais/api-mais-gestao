import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { terminalpdv } from "@/repositories/schema.js";
import { db } from "./connection";

export const PDV_API_KEY_PREFIX = "pdv_";
/** Janela em que outra instância com a mesma key é considerada ativa. */
export const PDV_INSTANCE_LEASE_MS = 10 * 60 * 1000;

export function hashPdvApiKey(apiKey: string): string {
	return createHash("sha256").update(apiKey.trim()).digest("hex");
}

export function gerarPdvApiKeyPlaintext(): {
	apiKey: string;
	prefix: string;
	hash: string;
} {
	const secret = randomBytes(24).toString("base64url");
	const apiKey = `${PDV_API_KEY_PREFIX}${secret}`;
	return {
		apiKey,
		prefix: apiKey.slice(0, 12),
		hash: hashPdvApiKey(apiKey),
	};
}

export async function buscarTerminalPdvPorApiKeyHash(hash: string) {
	const [registro] = await db
		.select()
		.from(terminalpdv)
		.where(and(eq(terminalpdv.apikey_hash, hash), isNotNull(terminalpdv.apikey_hash)));
	return registro;
}

export async function gravarApiKeyTerminalPdv(
	id: string,
	dados: { hash: string; prefix: string },
) {
	const agora = new Date().toISOString();
	const [registro] = await db
		.update(terminalpdv)
		.set({
			apikey_hash: dados.hash,
			apikey_prefix: dados.prefix,
			instance_id: null,
			instance_visto_em: null,
			atualizadoem: agora,
		})
		.where(eq(terminalpdv.id, id))
		.returning();
	return registro;
}

export async function atualizarInstanceTerminalPdv(
	id: string,
	instanceId: string,
) {
	const agora = new Date().toISOString();
	const [registro] = await db
		.update(terminalpdv)
		.set({
			instance_id: instanceId,
			instance_visto_em: agora,
			atualizadoem: agora,
		})
		.where(eq(terminalpdv.id, id))
		.returning();
	return registro;
}

export function instanceLeaseAtiva(
	instanceId: string | null | undefined,
	vistoEm: string | null | undefined,
	candidatoId: string,
): boolean {
	if (!instanceId || !vistoEm) return false;
	if (instanceId === candidatoId) return false;
	const visto = new Date(vistoEm).getTime();
	if (!Number.isFinite(visto)) return false;
	return Date.now() - visto < PDV_INSTANCE_LEASE_MS;
}
