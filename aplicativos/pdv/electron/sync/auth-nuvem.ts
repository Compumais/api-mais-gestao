import { getConfig } from "../db/database";
import { obterSessao } from "../db/repos";

/**
 * Sync com a nuvem: API key do terminal (modelo B) OU sessão Better Auth.
 * Operador local (offline:) não autentica na nuvem — só a key.
 */
export async function temAuthNuvem(): Promise<boolean> {
	const sessao = await obterSessao();
	if (!sessao.idempresa) return false;
	const apiKey = (await getConfig("pdv_api_key", "")).trim();
	if (apiKey.startsWith("pdv_")) return true;
	return Boolean(sessao.token);
}

export async function usaApiKeyDevice(): Promise<boolean> {
	const apiKey = (await getConfig("pdv_api_key", "")).trim();
	return apiKey.startsWith("pdv_");
}
