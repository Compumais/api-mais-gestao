const BRASIL_API_BASE_URL = "https://brasilapi.com.br/api";

type BrasilApiMunicipio = {
	nome: string;
	codigo_ibge: string;
};

type BrasilApiCep = {
	cep: string;
	state: string;
	city: string;
	neighborhood?: string;
	street?: string;
};

type CacheEntry<T> = {
	data: T;
	expiresAt: number;
};

const municipiosCache = new Map<string, CacheEntry<BrasilApiMunicipio[]>>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function obterDoCache<T>(cache: Map<string, CacheEntry<T>>, chave: string): T | null {
	const entrada = cache.get(chave);
	if (!entrada) return null;
	if (Date.now() > entrada.expiresAt) {
		cache.delete(chave);
		return null;
	}
	return entrada.data;
}

function salvarNoCache<T>(
	cache: Map<string, CacheEntry<T>>,
	chave: string,
	data: T,
): void {
	cache.set(chave, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function buscarMunicipiosBrasilApi(
	uf: string,
): Promise<BrasilApiMunicipio[]> {
	const ufNormalizada = uf.toUpperCase();
	const cacheado = obterDoCache(municipiosCache, ufNormalizada);
	if (cacheado) return cacheado;

	const resposta = await fetch(
		`${BRASIL_API_BASE_URL}/ibge/municipios/v1/${ufNormalizada}`,
		{
			headers: { Accept: "application/json" },
		},
	);

	if (!resposta.ok) {
		throw new Error(`BrasilAPI municípios retornou status ${resposta.status}`);
	}

	const dados = (await resposta.json()) as BrasilApiMunicipio[];
	salvarNoCache(municipiosCache, ufNormalizada, dados);
	return dados;
}

export async function buscarCepBrasilApi(
	cep: string,
): Promise<BrasilApiCep | null> {
	const resposta = await fetch(`${BRASIL_API_BASE_URL}/cep/v1/${cep}`, {
		headers: { Accept: "application/json" },
	});

	if (resposta.status === 404) {
		return null;
	}

	if (!resposta.ok) {
		throw new Error(`BrasilAPI CEP retornou status ${resposta.status}`);
	}

	return (await resposta.json()) as BrasilApiCep;
}

export function normalizarNomeLocalidade(nome: string): string {
	return nome
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}
