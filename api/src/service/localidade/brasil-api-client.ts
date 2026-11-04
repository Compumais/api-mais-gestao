const BRASIL_API_BASE_URL = "https://brasilapi.com.br/api";
const IBGE_MUNICIPIOS_URL =
	"https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const BRASIL_API_USER_AGENT = "MaisGestao/1.0 (+https://maisgestao.com.br)";
const TIMEOUT_MUNICIPIOS_MS = 8_000;

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

type MunicipioBruto = {
	nome?: unknown;
	codigo_ibge?: unknown;
	id?: unknown;
};

function normalizarMunicipios(
	dados: unknown,
	campoCodigo: "codigo_ibge" | "id",
): BrasilApiMunicipio[] {
	if (!Array.isArray(dados)) {
		throw new Error("Resposta de municípios inválida");
	}

	const lista = dados.flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const municipio = item as MunicipioBruto;
		const nome =
			typeof municipio.nome === "string" ? municipio.nome.trim() : "";
		const codigoBruto = municipio[campoCodigo];
		const codigo =
			typeof codigoBruto === "string" || typeof codigoBruto === "number"
				? String(codigoBruto).trim()
				: "";
		if (!nome || !codigo) return [];
		return [{ nome, codigo_ibge: codigo }];
	});

	if (lista.length === 0) {
		throw new Error("Nenhum município retornado");
	}

	return lista;
}

async function buscarJsonMunicipios(url: string): Promise<unknown> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MUNICIPIOS_MS);

	try {
		const resposta = await fetch(url, {
			headers: {
				Accept: "application/json",
				"User-Agent": BRASIL_API_USER_AGENT,
			},
			signal: controller.signal,
		});

		if (!resposta.ok) {
			throw new Error(`status ${resposta.status}`);
		}

		return await resposta.json();
	} finally {
		clearTimeout(timeout);
	}
}

async function buscarMunicipiosNoIbge(
	uf: string,
): Promise<BrasilApiMunicipio[]> {
	const dados = await buscarJsonMunicipios(
		`${IBGE_MUNICIPIOS_URL}/${uf}/municipios`,
	);
	return normalizarMunicipios(dados, "id");
}

async function buscarMunicipiosNaBrasilApi(
	uf: string,
): Promise<BrasilApiMunicipio[]> {
	const dados = await buscarJsonMunicipios(
		`${BRASIL_API_BASE_URL}/ibge/municipios/v1/${uf}`,
	);
	return normalizarMunicipios(dados, "codigo_ibge");
}

export async function buscarMunicipiosBrasilApi(
	uf: string,
): Promise<BrasilApiMunicipio[]> {
	const ufNormalizada = uf.trim().toUpperCase();
	const cacheado = obterDoCache(municipiosCache, ufNormalizada);
	if (cacheado) return cacheado;

	// A rota de municípios da BrasilAPI responde 504. O IBGE é a fonte oficial.
	let dados: BrasilApiMunicipio[];
	try {
		dados = await buscarMunicipiosNoIbge(ufNormalizada);
	} catch (erroIbge) {
		console.error(
			"IBGE indisponível ao listar municípios; tentando BrasilAPI:",
			erroIbge,
		);
		dados = await buscarMunicipiosNaBrasilApi(ufNormalizada);
	}

	salvarNoCache(municipiosCache, ufNormalizada, dados);
	return dados;
}

export async function buscarCepBrasilApi(
	cep: string,
): Promise<BrasilApiCep | null> {
	const resposta = await fetch(`${BRASIL_API_BASE_URL}/cep/v1/${cep}`, {
		headers: {
			Accept: "application/json",
			"User-Agent": BRASIL_API_USER_AGENT,
		},
	});

	if (resposta.status === 404) {
		return null;
	}

	if (!resposta.ok) {
		throw new Error(`BrasilAPI CEP retornou status ${resposta.status}`);
	}

	return (await resposta.json()) as BrasilApiCep;
}

export type BrasilApiCnpj = {
	cnpj: string;
	razao_social?: string;
	nome_fantasia?: string | null;
	descricao_situacao_cadastral?: string | null;
	data_situacao_cadastral?: string | null;
	descricao_motivo_situacao_cadastral?: string | null;
	data_inicio_atividade?: string | null;
	descricao_identificador_matriz_filial?: string | null;
	natureza_juridica?: string | null;
	capital_social?: number | null;
	email?: string | null;
	ddd_telefone_1?: string | null;
	logradouro?: string | null;
	numero?: string | null;
	complemento?: string | null;
	bairro?: string | null;
	municipio?: string | null;
	uf?: string | null;
	cep?: string | null;
	opcao_pelo_simples?: boolean | null;
	opcao_pelo_mei?: boolean | null;
	cnae_fiscal?: number | null;
	cnae_fiscal_descricao?: string | null;
	cnaes_secundarios?: Array<{
		codigo?: number | null;
		descricao?: string | null;
	}> | null;
	qsa?: Array<{
		nome_socio?: string | null;
		qualificacao_socio?: string | null;
		cnpj_cpf_do_socio?: string | null;
		data_entrada_sociedade?: string | null;
		nome_representante_legal?: string | null;
		faixa_etaria?: string | null;
	}> | null;
};

export class BrasilApiCnpjNaoEncontradoError extends Error {
	constructor(cnpj: string) {
		super(`CNPJ ${cnpj} não encontrado na BrasilAPI`);
		this.name = "BrasilApiCnpjNaoEncontradoError";
	}
}

export class BrasilApiCnpjErroConsultaError extends Error {
	constructor(mensagem: string) {
		super(mensagem);
		this.name = "BrasilApiCnpjErroConsultaError";
	}
}

export async function buscarCnpjBrasilApi(
	cnpj: string,
): Promise<BrasilApiCnpj> {
	const cnpjDigitos = cnpj.replace(/\D/g, "");
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);

	try {
		const resposta = await fetch(
			`${BRASIL_API_BASE_URL}/cnpj/v1/${cnpjDigitos}`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": BRASIL_API_USER_AGENT,
				},
				signal: controller.signal,
			},
		);

		if (resposta.status === 404) {
			throw new BrasilApiCnpjNaoEncontradoError(cnpjDigitos);
		}

		if (!resposta.ok) {
			throw new BrasilApiCnpjErroConsultaError(
				`BrasilAPI CNPJ retornou status ${resposta.status}`,
			);
		}

		return (await resposta.json()) as BrasilApiCnpj;
	} catch (error) {
		if (
			error instanceof BrasilApiCnpjNaoEncontradoError ||
			error instanceof BrasilApiCnpjErroConsultaError
		) {
			throw error;
		}

		if (error instanceof Error && error.name === "AbortError") {
			throw new BrasilApiCnpjErroConsultaError(
				"Timeout ao consultar CNPJ na BrasilAPI",
			);
		}

		throw new BrasilApiCnpjErroConsultaError(
			"Falha ao consultar CNPJ na BrasilAPI",
		);
	} finally {
		clearTimeout(timeout);
	}
}

export function normalizarNomeLocalidade(nome: string): string {
	return nome
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}
