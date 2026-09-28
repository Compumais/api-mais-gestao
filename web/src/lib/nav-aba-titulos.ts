/** Sufixos de criação reconhecidos nas rotas do ERP. */
const SEGMENTOS_CRIACAO = new Set(["novo", "nova"]);

/** Segmentos que nunca são tratados como id de recurso. */
const SEGMENTOS_NAO_ID = new Set([
	"novo",
	"nova",
	"editar",
	"relatorios",
	"acompanhamento",
	"comparativo",
	"rascunho",
	"importar",
	"captura-sefaz",
	"parametrizacao",
	"configuracao-fiscal",
	"naturezas",
	"taxas",
	"regras-fiscais",
	"cfop-depara",
]);

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_NUMERICO_RE = /^\d+$/;
/** CUID / nanoid-like (ex.: ids do backend). */
const ID_CUID_RE = /^c[a-z0-9]{8,}$/i;

export type TipoRotaAba =
	| "lista"
	| "criacao"
	| "edicao"
	| "detalhe"
	| "outra";

export type ClassificacaoRotaAba = {
	tipo: TipoRotaAba;
	/** Pathname usado para match no menu (pai em CRUD). */
	pathnameParaMatch: string;
	pathnamePai: string | null;
};

/**
 * Títulos de criação alinhados aos H1 das páginas `/novo` e `/nova`.
 * Chave = pathname pai (sem o sufixo novo/nova).
 */
export const TITULO_CRIACAO_POR_PREFIXO: Record<string, string> = {
	"/produtos": "Novo Produto",
	"/clientes": "Novo Cliente",
	"/fornecedores": "Novo Fornecedor",
	"/servicos": "Novo Serviço",
	"/bancos": "Novo Banco",
	"/usuarios": "Novo Usuário",
	"/grupos": "Nova Hierarquia",
	"/grupos-gourmet": "Novo grupo gourmet",
	"/unidade-medida": "Nova Unidade de Medida",
	"/fator-conversao": "Novo Fator de Conversão",
	"/tipos-cobranca": "Novo tipo de cobrança",
	"/tipos-problema": "Novo tipo de problema",
	"/meios-pagamento": "Novo meio de pagamento",
	"/contas-pagar": "Nova Conta a Pagar",
	"/contas-receber": "Nova Conta a Receber",
	"/contas-correntes": "Nova Conta Corrente",
	"/plano-contas": "Novo plano de contas",
	"/conta-contabil": "Nova conta contábil",
	"/budget": "Novo Budget",
	"/fichas-producao": "Nova ficha de produção",
	"/pedidos": "Novo Pedido",
	"/compras/pedidos": "Novo pedido de compra",
	"/compras/cotacoes": "Nova cotação de compra",
	"/tributos/naturezas": "Nova natureza",
	"/cfop": "Novo CFOP",
	"/configuracoes/modelos-impressao": "Novo modelo de impressão",
	"/configuracoes/modelos-impressao-pedido": "Novo modelo de impressão",
	"/empresas": "Nova empresa",
	"/ordens-servico": "Nova ordem de serviço",
	"/nota-fiscal-venda": "Nova NF-e",
	"/nota-fiscal-servico": "Nova NFS-e",
	"/nota-fiscal-compra": "Nova nota fiscal de compra",
};

export function segmentoPareceId(segmento: string): boolean {
	if (!segmento || SEGMENTOS_NAO_ID.has(segmento)) return false;
	return (
		UUID_RE.test(segmento) ||
		ID_NUMERICO_RE.test(segmento) ||
		ID_CUID_RE.test(segmento)
	);
}

export function truncarTituloAba(texto: string, max = 80): string {
	const limpo = texto.trim();
	if (limpo.length <= max) return limpo;
	return `${limpo.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function classificarRotaAba(pathname: string): ClassificacaoRotaAba {
	const segmentos = pathname.split("/").filter(Boolean);
	if (segmentos.length === 0) {
		return { tipo: "lista", pathnameParaMatch: pathname || "/", pathnamePai: null };
	}

	const ultimo = segmentos[segmentos.length - 1] ?? "";

	if (SEGMENTOS_CRIACAO.has(ultimo)) {
		const pai = `/${segmentos.slice(0, -1).join("/")}`;
		return {
			tipo: "criacao",
			pathnameParaMatch: pai || "/",
			pathnamePai: pai || "/",
		};
	}

	if (ultimo === "editar") {
		// /recurso/:id/editar → pai /recurso
		// /nfce/editar → pai /nfce
		const semEditar = segmentos.slice(0, -1);
		const talvezId = semEditar[semEditar.length - 1];
		const paiSegmentos =
			talvezId && segmentoPareceId(talvezId)
				? semEditar.slice(0, -1)
				: semEditar;
		const pai = paiSegmentos.length ? `/${paiSegmentos.join("/")}` : "/";
		return {
			tipo: "edicao",
			pathnameParaMatch: pai,
			pathnamePai: pai,
		};
	}

	if (segmentos.length >= 2 && segmentoPareceId(ultimo)) {
		const pai = `/${segmentos.slice(0, -1).join("/")}`;
		return {
			tipo: "detalhe",
			pathnameParaMatch: pai,
			pathnamePai: pai,
		};
	}

	return {
		tipo: segmentos.length <= 1 ? "lista" : "outra",
		pathnameParaMatch: pathname,
		pathnamePai: null,
	};
}

export function tituloCriacaoParaPathname(
	pathnamePai: string,
	search: string,
): string | null {
	const searchNorm = search.startsWith("?") ? search.slice(1) : search;
	const params = new URLSearchParams(searchNorm);

	if (pathnamePai === "/produtos" && params.has("clonar")) {
		return "Clonar Produto";
	}

	return TITULO_CRIACAO_POR_PREFIXO[pathnamePai] ?? null;
}
