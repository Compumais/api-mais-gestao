const IBPT_BASE_URL_PADRAO = "https://api-ibpt.seunegocionanuvem.com.br";
const IBPT_TIMEOUT_PADRAO_MS = 30_000;
const IBPT_USER_AGENT = "MaisGestao/1.0";

export type RespostaTabelaIbptApi = {
	versao: string;
	uf: string;
	total: number;
	ncm: Record<string, unknown>[];
};

export class IbptApiError extends Error {
	constructor(mensagem: string) {
		super(mensagem);
		this.name = "IbptApiError";
	}
}

function obterBaseUrl(): string {
	return (process.env.IBPT_API_BASE_URL ?? IBPT_BASE_URL_PADRAO).replace(
		/\/$/,
		"",
	);
}

function obterTimeoutMs(): number {
	const configurado = Number(process.env.IBPT_API_TIMEOUT_MS);
	return Number.isFinite(configurado) && configurado > 0
		? configurado
		: IBPT_TIMEOUT_PADRAO_MS;
}

function validarResposta(
	payload: unknown,
	ufEsperada: string,
): RespostaTabelaIbptApi {
	if (!payload || typeof payload !== "object") {
		throw new IbptApiError("API IBPT retornou resposta inválida");
	}

	const objeto = payload as Record<string, unknown>;
	const uf = String(objeto.uf ?? "")
		.trim()
		.toUpperCase();
	const versao = String(objeto.versao ?? "").trim();
	const registros = objeto.ncm;

	if (uf !== ufEsperada || !versao || !Array.isArray(registros)) {
		throw new IbptApiError("API IBPT retornou contrato inesperado");
	}

	return {
		versao,
		uf,
		total: Number(objeto.total ?? registros.length),
		ncm: registros.filter(
			(item): item is Record<string, unknown> =>
				!!item && typeof item === "object",
		),
	};
}

export async function baixarTabelaIbptPorUf(
	uf: string,
): Promise<RespostaTabelaIbptApi> {
	const ufNormalizada = uf.trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(ufNormalizada)) {
		throw new IbptApiError("UF inválida para consulta à API IBPT");
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), obterTimeoutMs());

	try {
		const url = new URL(`${obterBaseUrl()}/api_ibpt_json.php`);
		url.searchParams.set("uf", ufNormalizada);

		const resposta = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": IBPT_USER_AGENT,
			},
			signal: controller.signal,
		});

		if (!resposta.ok) {
			throw new IbptApiError(`API IBPT retornou status ${resposta.status}`);
		}

		return validarResposta(await resposta.json(), ufNormalizada);
	} catch (error) {
		if (error instanceof IbptApiError) {
			throw error;
		}
		if (error instanceof Error && error.name === "AbortError") {
			throw new IbptApiError("Timeout ao baixar tabela da API IBPT");
		}
		throw new IbptApiError("Falha ao consultar a API IBPT");
	} finally {
		clearTimeout(timeout);
	}
}
