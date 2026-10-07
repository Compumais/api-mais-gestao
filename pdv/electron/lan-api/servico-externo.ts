/**
 * Convivência entre o PDV rodando como serviço (`--lan-service`, sem janela) e
 * o app do caixa (com janela). Só um processo escuta a porta LAN. Se o serviço
 * já responde, o app do caixa não tenta abrir a mesma porta.
 */

export type RespostaHealthPdv = {
	ok?: unknown;
	app?: unknown;
};

/** Regra pura: a resposta de `/pos/health` é de um PDV Mais Gestão? */
export function respostaEhDoPdv(corpo: unknown): boolean {
	if (!corpo || typeof corpo !== "object") return false;
	const resposta = corpo as RespostaHealthPdv;
	return resposta.ok === true && resposta.app === "pdv-mais-gestao";
}

/** Lê o valor de `--nome=valor` em uma lista de argumentos. */
export function valorArgumento(
	argv: readonly string[],
	nome: string,
): string | null {
	const prefixo = `--${nome}=`;
	const achado = argv.find((arg) => arg.startsWith(prefixo));
	if (!achado) return null;
	const valor = achado.slice(prefixo.length).trim().replace(/^"|"$/g, "");
	return valor || null;
}

export async function servicoLanRespondendo(
	porta: number,
	timeoutMs = 1500,
): Promise<boolean> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(`http://127.0.0.1:${porta}/pos/health`, {
			signal: controller.signal,
			headers: { Accept: "application/json" },
		});
		if (!res.ok) return false;
		return respostaEhDoPdv(await res.json());
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}
