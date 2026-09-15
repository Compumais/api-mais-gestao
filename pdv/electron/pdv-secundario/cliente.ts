import { montarUrlPrincipal } from "./regras";

export class PrincipalOfflineError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PrincipalOfflineError";
	}
}

export class NumeroPdvDuplicadoError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NumeroPdvDuplicadoError";
	}
}

export type IdentidadePrincipal = {
	app: string;
	modo: string;
	numeropdv: number;
	lanPorta: number;
};

export type CatalogoPrincipal = {
	grupos: Array<{ id: string; nome: string }>;
	gruposGourmet: Array<{ id: string; nome: string }>;
	produtos: Array<{
		id: string;
		descricao: string;
		preco: number;
		unidademedida?: string | null;
		idunidademedida?: string | null;
		ean?: string | null;
		codigo?: number | null;
		idgrupo?: string | null;
		idgrupogourmet?: string | null;
		espizza?: number | null;
		imagem?: string | null;
		caminhoimagem?: string | null;
	}>;
	atalhos: Array<{ id: string }>;
	clientes?: Array<{
		id: string;
		nome: string;
		razaosocial?: string | null;
		cnpjcpf?: string | null;
		telefone?: string | null;
		email?: string | null;
	}>;
	bandeiras?: Array<{
		id: string;
		codigo?: string | null;
		descricao: string;
	}>;
	meiosPagamento?: Array<{
		id: string;
		descricao: string;
		formapagamentonfe?: string | null;
		aprazo?: number | null;
	}>;
	atualizadoem?: string;
};

export class PrincipalNaoAutorizadoError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PrincipalNaoAutorizadoError";
	}
}

export async function requisitarPrincipal<T>(
	baseUrl: string,
	path: string,
	init: RequestInit & { token?: string; timeoutMs?: number } = {},
): Promise<T> {
	const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
	const { token, headers, timeoutMs = 8000, ...resto } = init;
	let res: Response;
	try {
		res = await fetch(url, {
			...resto,
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...headers,
			},
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch {
		throw new PrincipalOfflineError(
			`PDV principal offline ou inacessível em ${baseUrl}. Verifique o IP, a porta e se o principal está ligado com a API LAN ativa.`,
		);
	}

	const body: unknown = await res.json().catch(() => ({}));
	const mensagem =
		body &&
		typeof body === "object" &&
		"error" in body &&
		typeof (body as { error: unknown }).error === "string"
			? (body as { error: string }).error
			: `Erro ${res.status} ao falar com o PDV principal`;

	if (!res.ok) {
		if (res.status === 401 || /não autoriz|sessão/i.test(mensagem)) {
			throw new PrincipalNaoAutorizadoError(mensagem);
		}
		if (
			res.status === 409 ||
			/duplicad|mesmo número|é o do PDV principal/i.test(mensagem)
		) {
			throw new NumeroPdvDuplicadoError(mensagem);
		}
		throw new Error(mensagem);
	}
	return body as T;
}

/** @deprecated use requisitarPrincipal */
async function requisitar<T>(
	baseUrl: string,
	path: string,
	init: RequestInit & { token?: string } = {},
): Promise<T> {
	return requisitarPrincipal<T>(baseUrl, path, init);
}

export function unwrapDataEnvelope<T>(body: T | { data: T }): T {
	if (
		body &&
		typeof body === "object" &&
		"data" in (body as object) &&
		(body as { data: unknown }).data !== undefined
	) {
		return (body as { data: T }).data;
	}
	return body as T;
}

export function urlDoPrincipal(host: string, porta?: string | number): string {
	return montarUrlPrincipal(host, porta);
}

export async function pingIdentidade(
	baseUrl: string,
): Promise<IdentidadePrincipal> {
	return requisitar<IdentidadePrincipal>(baseUrl, "/pos/pdv/identidade");
}

export type TerminaisPrincipal = {
	numeropdvPrincipal: number;
	terminais: Array<{ numeropdv: number; descricao: string | null }>;
	ocupados: number[];
};

export async function buscarTerminaisRemoto(
	baseUrl: string,
): Promise<TerminaisPrincipal> {
	return requisitar<TerminaisPrincipal>(baseUrl, "/pos/pdv/terminais");
}

export async function handshakePrincipal(
	baseUrl: string,
	params: { numeropdv: number; identificador: string },
): Promise<{ token: string; numeropdv: number; numeropdvPrincipal?: number }> {
	return requisitar(baseUrl, "/pos/pdv/handshake", {
		method: "POST",
		body: JSON.stringify(params),
	});
}

export async function puxarConfigNegocioRemota(
	baseUrl: string,
	token: string,
): Promise<Record<string, string>> {
	const body = await requisitar<{ config: Record<string, string> }>(
		baseUrl,
		"/pos/pdv/config-negocio",
		{ token },
	);
	return body.config ?? {};
}

export async function puxarCatalogoRemoto(
	baseUrl: string,
	token: string,
): Promise<CatalogoPrincipal> {
	return requisitar<CatalogoPrincipal>(baseUrl, "/pos/pdv/catalogo", { token });
}
