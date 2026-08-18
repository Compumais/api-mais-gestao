import { getConfig } from "../db/database";
import { obterSessao } from "../db/repos";

export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

/** Formata issues do Zod vindos em `details` da API. */
function formatarDetalhesValidacao(json: unknown): string | null {
	if (!json || typeof json !== "object") return null;
	const details = (json as { details?: unknown }).details;
	if (!Array.isArray(details) || details.length === 0) return null;
	return details
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const issue = item as {
				path?: Array<string | number>;
				message?: string;
			};
			const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
			const message = issue.message ?? "inválido";
			return path ? `${path}: ${message}` : message;
		})
		.filter((v): v is string => Boolean(v))
		.join("; ");
}

/** API PDV espera números monetários/qtd como string (igual ao POS Android). */
export function asApiDecimal(
	value: number | string | null | undefined,
): string {
	if (value === null || value === undefined) return "0";
	if (typeof value === "string") {
		const trimmed = value.trim().replace(",", ".");
		return trimmed.length ? trimmed : "0";
	}
	if (!Number.isFinite(value)) return "0";
	return String(value);
}

async function baseUrl(): Promise<string> {
	return (await getConfig("api_url", "https://api.compuchat.space")).replace(
		/\/$/,
		"",
	);
}

function mensagemErroApi(json: unknown, status: number): string {
	if (json && typeof json === "object") {
		const obj = json as Record<string, unknown>;
		const detailsMsg = formatarDetalhesValidacao(json);
		const candidatos = [obj.error, obj.message, obj.code]
			.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
			.map((v) => v.trim());
		if (candidatos.length) {
			const base = candidatos.join(" — ");
			return detailsMsg ? `${base} — ${detailsMsg}` : base;
		}
		if (typeof obj.raw === "string" && obj.raw.trim()) {
			const trecho = obj.raw.replace(/\s+/g, " ").trim().slice(0, 160);
			return `HTTP ${status} (resposta não-JSON): ${trecho}`;
		}
	}
	return `HTTP ${status}`;
}

export function isEmpresaAcessoNegado(err: unknown): boolean {
	if (!(err instanceof ApiError) || err.status !== 403) {
		return false;
	}
	return /EMPRESA_ACESSO_NEGADO|não pertence à empresa/i.test(err.message);
}

async function request<T>(
	path: string,
	options: {
		method?: string;
		body?: unknown;
		auth?: boolean;
		timeoutMs?: number;
	} = {},
): Promise<T> {
	const { method = "GET", body, auth = true, timeoutMs = 20000 } = options;
	const headers: Record<string, string> = {
		Accept: "application/json",
	};
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
	}
	if (auth) {
		const token = (await obterSessao()).token;
		if (!token) {
			throw new ApiError("Sem token de sessão", 401);
		}
		headers.Authorization = `Bearer ${token}`;
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(`${await baseUrl()}${path}`, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal: controller.signal,
		});
		const text = await res.text();
		let json: unknown = null;
		if (text) {
			try {
				json = JSON.parse(text);
			} catch {
				json = { raw: text };
			}
		}
		if (!res.ok) {
			throw new ApiError(mensagemErroApi(json, res.status), res.status);
		}
		return json as T;
	} catch (err) {
		if (err instanceof ApiError) {
			throw err;
		}
		if (err instanceof Error && err.name === "AbortError") {
			throw new ApiError("Timeout na comunicação com a API", 408);
		}
		throw new ApiError(err instanceof Error ? err.message : "Falha de rede", 0);
	} finally {
		clearTimeout(timer);
	}
}

export async function pingApi(): Promise<boolean> {
	const url = `${await baseUrl()}/health`;
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 5000);
		try {
			const res = await fetch(url, {
				signal: controller.signal,
				headers: { Accept: "application/json" },
			});
			if (!res.ok) return false;
			const ctype = res.headers.get("content-type") ?? "";
			if (!ctype.includes("application/json")) return false;
			const body = (await res.json()) as { service?: string; status?: string };
			return (
				body.service === "api-mais-gestao" ||
				body.status === "ok" ||
				body.status === "degraded"
			);
		} finally {
			clearTimeout(timer);
		}
	} catch {
		return false;
	}
}

export async function apiBaseUrl(): Promise<string> {
	return baseUrl();
}

export async function loginEmail(email: string, password: string) {
	const data = await request<{
		token?: string;
		user?: { id?: string; name?: string; nome?: string; email?: string };
		session?: { token?: string };
	}>("/api/auth/sign-in/email", {
		method: "POST",
		body: { email, password },
		auth: false,
	});

	const token = data.token ?? data.session?.token;

	if (!token) {
		throw new ApiError("Sessão sem token. Verifique a API.");
	}

	return {
		token,
		userid: data.user?.id ?? null,
		username: data.user?.name ?? data.user?.nome ?? data.user?.email ?? email,
	};
}

export async function obterPerfilUsuario(): Promise<{ perfil: unknown }> {
	const data = await request<{ perfil?: unknown }>("/api/auth/perfil");
	return { perfil: data.perfil ?? [] };
}

export async function obterMeuPlano(idempresa?: string | null): Promise<{
	modulos: unknown;
}> {
	const path = idempresa
		? `/planos/meu-plano?idempresa=${encodeURIComponent(idempresa)}`
		: "/planos/meu-plano";
	const data = await request<{ modulos?: unknown }>(path);
	return { modulos: data.modulos ?? [] };
}

export async function listarEmpresas(idusuario?: string | null) {
	let path = "/empresas?page=1&limit=100";
	if (idusuario) {
		path += `&idusuario=${encodeURIComponent(idusuario)}`;
	}
	const data = await request<{
		data: Array<{
			id: string;
			nome?: string;
			razaosocial?: string;
			cnpj?: string;
		}>;
	}>(path);
	return (data.data ?? []).map((e) => ({
		id: e.id,
		nome: e.nome ?? e.razaosocial ?? e.id,
		cnpj: e.cnpj ?? null,
	}));
}

export async function buscarEmpresa(idempresa: string) {
	return request<{
		id: string;
		nome?: string;
		razaosocial?: string;
		cnpj?: string;
		telefone?: string;
		endereco?: string;
		numero?: string;
		bairro?: string;
		uf?: string;
	}>(`/empresas/${idempresa}`);
}

export async function buscarEmpresaFiscal(idempresa: string) {
	return request<{
		razaosocial?: string | null;
		nomefantasia?: string | null;
		inscricaoestadual?: string | null;
		logradouro?: string | null;
		numero?: string | null;
		bairro?: string | null;
		uf?: string | null;
		telefone?: string | null;
		crt?: number | null;
	}>(`/empresas/${idempresa}/fiscal`);
}

export async function listarProdutos(params: {
	idempresa: string;
	q?: string;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 100;
	let path = `/produtos?idempresa=${encodeURIComponent(params.idempresa)}&inativo=0&page=${page}&limit=${limit}`;
	if (params.q?.trim()) {
		path += `&q=${encodeURIComponent(params.q.trim())}`;
	}
	const data = await request<{
		data: Array<{
			id: string;
			descricao?: string;
			nome?: string;
			preco?: number | string;
			unidademedida?: string;
			idunidademedida?: string;
			ean?: string;
			codigoean?: string;
			codigo?: number | string | null;
			idgrupo?: string;
			idgrupogourmet?: string | null;
			espizza?: number | null;
			imagem?: string | null;
			caminhoimagem?: string | null;
		}>;
	}>(path);

	return (data.data ?? []).map((p) => ({
		id: p.id,
		descricao: p.descricao ?? p.nome ?? "",
		preco: Number(p.preco ?? 0),
		unidademedida: p.unidademedida ?? null,
		idunidademedida: p.idunidademedida ?? null,
		ean: p.ean ?? p.codigoean ?? null,
		codigo: Number(p.codigo) > 0 ? Number(p.codigo) : null,
		idgrupo: p.idgrupo ?? null,
		idgrupogourmet: p.idgrupogourmet ?? null,
		espizza: Number(p.espizza ?? 0) === 1 ? 1 : 0,
		imagem: p.imagem ?? null,
		caminhoimagem: p.caminhoimagem ?? null,
	}));
}

export async function listarUnidadesMedida(idempresa: string) {
	const unidades: Array<{
		id: string;
		codigo: string | null;
		nome: string | null;
	}> = [];
	let page = 1;
	for (;;) {
		const path = `/unidades-medida?idempresa=${encodeURIComponent(idempresa)}&page=${page}&limit=100`;
		const data = await request<{
			data: Array<{
				id: string;
				codigo?: string | null;
				nome?: string | null;
			}>;
		}>(path);
		const lote = data.data ?? [];
		for (const u of lote) {
			unidades.push({
				id: u.id,
				codigo: u.codigo ?? null,
				nome: u.nome ?? null,
			});
		}
		if (lote.length < 100 || page > 20) break;
		page += 1;
	}
	return unidades;
}

export async function listarGrupos(params: {
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 100;
	const path = `/hierarquias?idempresa=${encodeURIComponent(params.idempresa)}&page=${page}&limit=${limit}`;
	const data = await request<{
		data: Array<{ id: string; nome?: string | null }>;
	}>(path);

	return (data.data ?? [])
		.filter((g) => g.nome)
		.map((g) => ({ id: g.id, nome: String(g.nome) }));
}

export async function listarGruposGourmet(params: {
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 100;
	const path = `/grupos-gourmet?idempresa=${encodeURIComponent(params.idempresa)}&page=${page}&limit=${limit}`;
	const data = await request<{
		data: Array<{ id: string; nome?: string | null; inativo?: number | null }>;
	}>(path);

	return (data.data ?? [])
		.filter((g) => g.nome && g.inativo !== 1)
		.map((g) => ({ id: g.id, nome: String(g.nome) }));
}

export async function listarClientes(params: {
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 100;
	const path = `/entidades?idempresa=${encodeURIComponent(params.idempresa)}&cliente=1&page=${page}&limit=${limit}`;
	const data = await request<{
		data: Array<{
			id: string;
			nome?: string | null;
			razaosocial?: string | null;
			cnpjcpf?: string | null;
			telefone?: string | null;
			email?: string | null;
		}>;
	}>(path);

	return (data.data ?? []).map((c) => ({
		id: c.id,
		nome: (c.nome ?? c.razaosocial ?? "").trim() || c.id,
		razaosocial: c.razaosocial ?? null,
		cnpjcpf: c.cnpjcpf ?? null,
		telefone: c.telefone ?? null,
		email: c.email ?? null,
	}));
}

export async function listarBandeirasCartao(params: {
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 100;
	const path = `/bandeiras-cartao?idempresa=${encodeURIComponent(params.idempresa)}&inativo=0&page=${page}&limit=${limit}`;
	const data = await request<{
		data: Array<{
			id: string;
			codigo?: string | null;
			descricao?: string | null;
		}>;
	}>(path);

	return (data.data ?? [])
		.filter((b) => b.descricao?.trim())
		.map((b) => ({
			id: b.id,
			codigo: b.codigo ?? null,
			descricao: String(b.descricao).trim(),
		}));
}

export async function listarTiposDocumentoFinanceiro(params: {
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const page = params.page ?? 1;
	const limit = params.limit ?? 100;
	const path = `/tipos-documento-financeiro?idempresa=${encodeURIComponent(params.idempresa)}&inativo=0&page=${page}&limit=${limit}`;
	const data = await request<{
		data: Array<{
			id: string;
			descricao?: string | null;
			formapagamentonfe?: string | null;
			aprazo?: number | null;
		}>;
	}>(path);

	return (data.data ?? [])
		.filter((m) => m.descricao?.trim())
		.map((m) => ({
			id: m.id,
			descricao: String(m.descricao).trim(),
			formapagamentonfe: m.formapagamentonfe ?? null,
			aprazo: Number(m.aprazo ?? 0) === 1 ? 1 : 0,
		}));
}

export async function listarAtalhosRemotos(idempresa: string) {
	const data = await request<{
		data?: Array<{ idproduto: string }>;
		idsProdutos?: string[];
	}>(`/atalhos-pdv?idempresa=${encodeURIComponent(idempresa)}`);

	if (Array.isArray(data.idsProdutos)) {
		return data.idsProdutos;
	}
	return (data.data ?? []).map((a) => a.idproduto);
}

export async function substituirAtalhosRemotos(
	idempresa: string,
	idsProdutos: string[],
) {
	const data = await request<{
		data?: Array<{ idproduto: string }>;
	}>("/atalhos-pdv", {
		method: "PUT",
		body: { idempresa, idsProdutos },
	});
	return (data.data ?? []).map((a) => a.idproduto);
}

export type LancamentoPagamentoApi = {
	meio: "DINHEIRO" | "PIX" | "CARTAO";
	valor: number | string;
	nsu?: string | null;
	autorizacao?: string | null;
	bandeira?: string | null;
	status?: "ok" | "pendente" | "cancelado";
};

/** Origem na retaguarda: 0 legado, 1 balcão web, 2 POS Android, 3 PDV híbrido. */
export const VENDA_LOCAL_PDV_HIBRIDO = 3;

export async function criarVendaPdv(
	body: Record<string, unknown> & {
		pagamentos?: LancamentoPagamentoApi[];
	},
) {
	const { pagamentos, ...resto } = body;
	return request<{ id: string }>("/vendas-pdv-gourmet", {
		method: "POST",
		body: {
			...resto,
			...(pagamentos?.length
				? {
						pagamentos: pagamentos.map((item) => ({
							meio: item.meio,
							valor: asApiDecimal(item.valor),
							...(item.nsu ? { nsu: item.nsu } : {}),
							...(item.autorizacao ? { autorizacao: item.autorizacao } : {}),
							...(item.bandeira ? { bandeira: item.bandeira } : {}),
							status: item.status ?? "ok",
						})),
					}
				: {}),
		},
	});
}

export async function buscarVendaPdvGourmet(id: string) {
	return request<{
		id: string;
		idnotafiscalnfce?: string | null;
		nfce?: {
			idnotafiscal: string;
			status: number | null;
			chave: string | null;
			serie: string | null;
			numero: string | null;
			protocolo: string | null;
		} | null;
	}>(`/vendas-pdv-gourmet/${id}`);
}

export async function criarItemVendaPdv(body: {
	idempresa: string;
	idvenda: string;
	idproduto: string;
	quantidade: number | string;
	precounitario: number | string;
	precototal: number | string;
	precopromocao?: number | string;
	precoalterado?: number | string;
	taxaservico?: number;
	descricao?: string | null;
}) {
	return request("/vendas-pdv-item", {
		method: "POST",
		body: {
			idempresa: body.idempresa,
			idvenda: body.idvenda,
			idproduto: body.idproduto,
			quantidade: asApiDecimal(body.quantidade),
			precounitario: asApiDecimal(body.precounitario),
			precototal: asApiDecimal(body.precototal),
			precopromocao: asApiDecimal(body.precopromocao ?? 0),
			precoalterado: asApiDecimal(body.precoalterado ?? 0),
			...(body.taxaservico !== undefined
				? { taxaservico: body.taxaservico }
				: {}),
			...(body.descricao ? { descricao: body.descricao.slice(0, 120) } : {}),
		},
	});
}

export async function baixaEstoqueVenda(body: {
	idempresa: string;
	idvenda: string;
	itens: Array<{
		idproduto: string;
		quantidade: number | string;
		precounitario: number | string;
		nomeproduto?: string;
	}>;
	pagamentos: {
		valortotal: number | string;
		valortroco?: number | string;
		valordinheiro?: number | string;
		valorpix?: number | string;
		valorcartaocredito?: number | string;
		valorcartaodebito?: number | string;
		valorcartao?: number | string;
		valorprepago?: number | string;
		desconto?: number | string;
		valortaxaservico?: number | string;
		valorcouverartistico?: number | string;
	};
	emitirNfce?: boolean;
}) {
	return request<{
		idnotafiscal?: string;
		deveEmitirNfce?: boolean;
		avisos?: string[];
		emissaoNfce?: {
			emitida?: boolean;
			chave?: string;
			qrCode?: string;
			protocolo?: string;
			idnotafiscal?: string;
			cStat?: string;
			xMotivo?: string;
			erro?: string;
			xml?: string;
			serie?: string;
			numero?: number;
			pendencias?: Array<{ codigo?: string; mensagem: string }>;
		};
		nfce?: {
			emitida?: boolean;
			chave?: string;
			qrCode?: string;
			protocolo?: string;
			erro?: string;
		};
	}>("/estoque/baixa-venda", {
		method: "POST",
		body: {
			idempresa: body.idempresa,
			idvenda: body.idvenda,
			itens: body.itens.map((i) => ({
				idproduto: i.idproduto,
				quantidade: asApiDecimal(i.quantidade),
				precounitario: asApiDecimal(i.precounitario),
				...(i.nomeproduto ? { nomeproduto: i.nomeproduto } : {}),
			})),
			pagamentos: {
				valortotal: asApiDecimal(body.pagamentos.valortotal),
				valortroco: asApiDecimal(body.pagamentos.valortroco ?? 0),
				valordinheiro: asApiDecimal(body.pagamentos.valordinheiro ?? 0),
				valorpix: asApiDecimal(body.pagamentos.valorpix ?? 0),
				valorcartaocredito: asApiDecimal(
					body.pagamentos.valorcartaocredito ?? 0,
				),
				valorcartaodebito: asApiDecimal(body.pagamentos.valorcartaodebito ?? 0),
				valorcartao: asApiDecimal(body.pagamentos.valorcartao ?? 0),
				valorprepago: asApiDecimal(body.pagamentos.valorprepago ?? 0),
			},
			...(body.emitirNfce === false ? { emitirNfce: false } : {}),
		},
		timeoutMs: 60000,
	});
}

/** Extrai resultado fiscal da baixa de estoque (API atual + legado). */
export function extrairNfceDaBaixa(
	baixa: Awaited<ReturnType<typeof baixaEstoqueVenda>>,
): {
	emitida: boolean;
	chave?: string;
	qrCode?: string;
	protocolo?: string;
	idnotafiscal?: string;
	cStat?: string;
	erro?: string;
	xml?: string;
	serie?: string;
	numero?: number;
} {
	const nfce = baixa.emissaoNfce ?? baixa.nfce;
	const pendencias = baixa.emissaoNfce?.pendencias
		?.map((p) => p.mensagem)
		.filter(Boolean)
		.join("; ");
	const motivo =
		nfce && "xMotivo" in nfce
			? ((nfce as { xMotivo?: string }).xMotivo ?? undefined)
			: undefined;
	const erroBase =
		nfce?.erro ??
		motivo ??
		pendencias ??
		baixa.avisos?.find((a) =>
			/nfc|sefaz|cfop|duplicidade|emissão|rejeic/i.test(a),
		) ??
		baixa.avisos?.[0];

	const cStat =
		nfce && "cStat" in nfce
			? ((nfce as { cStat?: string }).cStat ?? undefined)
			: undefined;

	const emitida = Boolean(nfce?.emitida);

	let erro: string | undefined;
	if (!emitida) {
		if (cStat && erroBase) {
			erro = `Rejeição ${cStat}: ${erroBase}`;
		} else if (erroBase) {
			erro = erroBase;
		} else if (baixa.deveEmitirNfce !== false) {
			erro = "Falha na emissão da NFC-e (sem detalhe retornado pela API)";
		}
	}

	const xml =
		nfce && "xml" in nfce
			? ((nfce as { xml?: string }).xml ?? undefined)
			: undefined;
	const serie =
		nfce && "serie" in nfce
			? ((nfce as { serie?: string }).serie ?? undefined)
			: undefined;
	const numero =
		nfce && "numero" in nfce
			? ((nfce as { numero?: number }).numero ?? undefined)
			: undefined;

	return {
		emitida,
		chave: nfce?.chave,
		qrCode: nfce?.qrCode,
		protocolo: nfce?.protocolo,
		idnotafiscal:
			baixa.emissaoNfce?.idnotafiscal ?? baixa.idnotafiscal ?? undefined,
		cStat,
		erro,
		xml,
		serie,
		numero,
	};
}

export async function buscarCupomNfce(idnotafiscal: string) {
	const data = await request<{
		chave?: string;
		qrCode?: string;
		xml?: string;
		protocolo?: string;
		nfce?: {
			chave?: string;
			qrCode?: string;
			xml?: string;
			protocolo?: string;
			serie?: string;
			numero?: number;
		};
	}>(`/nfce/${idnotafiscal}/cupom`);
	return {
		chave: data.nfce?.chave ?? data.chave,
		qrCode: data.nfce?.qrCode ?? data.qrCode,
		xml: data.nfce?.xml ?? data.xml,
		protocolo: data.nfce?.protocolo ?? data.protocolo,
		serie: data.nfce?.serie,
		numero: data.nfce?.numero,
	};
}

export async function buscarPdvFiscal(idempresa: string, numeropdv: number) {
	return request<{
		numeropdv: number;
		descricao: string | null;
		ativo: boolean;
		ambiente: number;
		csc_id: string | null;
		csc_token: string | null;
		cnpj: string | null;
		uf: string | null;
		serie: string;
		numeroproximo: number;
		certificado: {
			apelido: string;
			cnpjcertificado: string;
			validadeinicio: string | null;
			validadefim: string | null;
			pfxBase64: string;
			senha: string;
		} | null;
	}>(`/empresas/${idempresa}/pdv-fiscal?numeropdv=${numeropdv}`);
}

export type TerminalPdvRemoto = {
	id: string;
	numeropdv: number;
	descricao: string | null;
	ativo: boolean;
	serie: string;
	numeroproximo: number;
};

export async function listarTerminaisPdv(idempresa: string) {
	const data = await request<{ data: TerminalPdvRemoto[] }>(
		`/terminais-pdv?idempresa=${encodeURIComponent(idempresa)}`,
	);
	return data.data ?? [];
}

export async function buscarNfceConfig(idempresa: string) {
	return request<{
		ambiente?: number;
		idcsc_homologacao?: string | null;
		csctoken_homologacao?: string | null;
		idcsc_producao?: string | null;
		csctoken_producao?: string | null;
		ultimaidserie?: string | null;
		contingenciaativa?: boolean;
		cnpj?: string | null;
	}>(`/empresas/${idempresa}/nfce-configuracao`);
}

export async function transmitirNfceContingencia(body: {
	idempresa: string;
	idvenda?: string;
	xml: string;
	chave?: string;
	serie: number;
	numero: number;
	motivo: string;
	datacontingencia: string;
}) {
	return request<{
		idnotafiscal?: string;
		status?: string;
		protocolo?: string;
		transmitida?: boolean;
		erro?: string;
	}>("/nfce/contingencia/transmitir", {
		method: "POST",
		body,
		timeoutMs: 60000,
	});
}

export type ResultadoEmissaoNfceApi = {
	emitida: boolean;
	idnotafiscal?: string;
	chave?: string;
	qrCode?: string;
	protocolo?: string;
	cStat?: string;
	xMotivo?: string;
	erro?: string;
	xml?: string;
	serie?: string | number;
	numero?: number;
	pendencias?: Array<{ codigo?: string; mensagem: string }>;
};

export async function retransmitirNfceVendaPdv(body: {
	idempresa: string;
	idvenda: string;
}) {
	return request<ResultadoEmissaoNfceApi>(
		`/nfce/venda/${body.idvenda}/retransmitir`,
		{
			method: "POST",
			body: { idempresa: body.idempresa },
			timeoutMs: 60000,
		},
	);
}

export type ResultadoInutilizacaoNfceApi = {
	idnotafiscal: string;
	status: number;
	cStat?: string;
	xMotivo?: string;
	protocolo?: string;
};

export async function inutilizarNfceVendaPdv(body: {
	idempresa: string;
	idvenda: string;
	justificativa: string;
}) {
	return request<ResultadoInutilizacaoNfceApi>(
		`/nfce/venda/${body.idvenda}/inutilizar`,
		{
			method: "POST",
			body: {
				idempresa: body.idempresa,
				justificativa: body.justificativa,
			},
			timeoutMs: 60000,
		},
	);
}

export const STATUS_CAIXA_ABERTO = 0;
export const STATUS_CAIXA_FECHADO = 1;

export function extrairIdFechamentoCaixa(json: unknown): string | null {
	if (!json || typeof json !== "object") return null;
	const obj = json as Record<string, unknown>;
	const aninhado =
		obj.body && typeof obj.body === "object"
			? (obj.body as Record<string, unknown>)
			: null;
	const id = aninhado?.id ?? obj.id;
	if (id == null || id === "") return null;
	return String(id);
}

export async function criarFechamentoCaixaRemoto(
	body: Record<string, unknown>,
): Promise<string> {
	const json = await request<unknown>("/fechamentos-caixa", {
		method: "POST",
		body,
	});
	const id = extrairIdFechamentoCaixa(json);
	if (!id) {
		throw new ApiError("Retaguarda não devolveu o ID do fechamento de caixa");
	}
	return id;
}

/** @deprecated use criarFechamentoCaixaRemoto */
export async function abrirCaixaRemoto(body: Record<string, unknown>) {
	const id = await criarFechamentoCaixaRemoto(body);
	return { id };
}

export async function atualizarFechamentoCaixaRemoto(
	id: string | number,
	body: Record<string, unknown>,
): Promise<void> {
	await request(`/fechamentos-caixa/${id}`, {
		method: "PUT",
		body,
	});
}
