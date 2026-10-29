export const CHAVE_TECLAS_FUNCAO = "teclas_funcao";

export const ACOES_TECLA = [
	"finalizar",
	"receber",
	"desconto",
	"dinheiro",
	"pix",
	"cartao",
	"fechar_caixa",
	"sair",
	"sincronizar",
	"historico",
] as const;

export type AcaoTecla = (typeof ACOES_TECLA)[number];

export type MapaTeclasFuncao = Record<AcaoTecla, string>;

export const TECLAS_FUNCAO_PADRAO: MapaTeclasFuncao = {
	finalizar: "F8",
	receber: "F5",
	desconto: "F11",
	dinheiro: "F7",
	pix: "F8",
	cartao: "F10",
	fechar_caixa: "F9",
	sair: "F12",
	sincronizar: "F5",
	historico: "F3",
};

export const ROTULO_ACAO_TECLA: Record<AcaoTecla, string> = {
	finalizar: "Finalizar venda",
	receber: "Receber / fechar conta",
	desconto: "Desconto",
	dinheiro: "Dinheiro",
	pix: "PIX",
	cartao: "Cartão",
	fechar_caixa: "Fechar caixa",
	sair: "Sair",
	sincronizar: "Sincronizar",
	historico: "Histórico",
};

export const ESCOPO_VENDA: AcaoTecla[] = [
	"finalizar",
	"receber",
	"desconto",
	"fechar_caixa",
	"sair",
	"sincronizar",
	"historico",
];

export const ESCOPO_PAGAMENTO: AcaoTecla[] = ["dinheiro", "pix", "cartao"];

export type MapaTeclasMeios = Record<string, string>;

export type MeioTeclaRef = {
	id: string;
	meio: string;
};

const ACOES_SET = new Set<string>(ACOES_TECLA);

function objetoTeclas(raw: unknown): Record<string, unknown> {
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
		} catch {
			return {};
		}
	} else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		return raw as Record<string, unknown>;
	}
	return {};
}

export function normalizarHotkey(evento: KeyboardEvent): string | null {
	if (evento.ctrlKey || evento.metaKey || evento.altKey) return null;
	if (evento.key === "Shift") return null;
	const tecla = evento.key;
	if (!tecla || tecla === "Unidentified") return null;
	if (tecla === "Escape" || tecla === "Tab") return null;
	if (tecla.length === 1) return tecla.toUpperCase();
	return tecla;
}

export function parseTeclasFuncao(raw: unknown): MapaTeclasFuncao {
	const mapa: MapaTeclasFuncao = { ...TECLAS_FUNCAO_PADRAO };
	const origem = objetoTeclas(raw);
	for (const acao of ACOES_TECLA) {
		const valor = origem[acao];
		if (typeof valor === "string" && valor.trim()) {
			mapa[acao] = valor.trim();
		}
	}
	return mapa;
}

export function parseTeclasMeiosPagamento(raw: unknown): MapaTeclasMeios {
	const origem = objetoTeclas(raw).meios;
	if (!origem || typeof origem !== "object" || Array.isArray(origem)) {
		return {};
	}
	const mapa: MapaTeclasMeios = {};
	for (const [id, valor] of Object.entries(origem as Record<string, unknown>)) {
		if (typeof valor === "string" && valor.trim()) {
			mapa[id] = valor.trim();
		}
	}
	return mapa;
}

export function serializarTeclasFuncao(
	mapa: MapaTeclasFuncao,
	meios: MapaTeclasMeios = {},
): string {
	const meiosLimpos: MapaTeclasMeios = {};
	for (const [id, tecla] of Object.entries(meios)) {
		if (tecla.trim()) {
			meiosLimpos[id] = tecla.trim();
		}
	}
	return JSON.stringify({
		...mapa,
		...(Object.keys(meiosLimpos).length ? { meios: meiosLimpos } : {}),
	});
}

export function teclaNativaDoMeio(
	meio: string,
	acoes: MapaTeclasFuncao,
): string {
	const tipo = meio.trim().toUpperCase();
	if (tipo === "DINHEIRO") return acoes.dinheiro;
	if (tipo === "PIX") return acoes.pix;
	if (tipo === "CARTAO") return acoes.cartao;
	return "";
}

export const TECLA_MEIO_NENHUMA = "-";

export function resolverTeclasMeiosPagamento(
	refs: MeioTeclaRef[],
	acoes: MapaTeclasFuncao,
	meiosSalvos: MapaTeclasMeios,
): MapaTeclasMeios {
	const resultado: MapaTeclasMeios = {};
	const usadas = new Set<string>();
	const bloqueados = new Set<string>();
	for (const ref of refs) {
		if (!Object.hasOwn(meiosSalvos, ref.id)) continue;
		const salva = meiosSalvos[ref.id]?.trim() ?? "";
		if (!salva || salva === TECLA_MEIO_NENHUMA) {
			bloqueados.add(ref.id);
			continue;
		}
		resultado[ref.id] = salva;
		usadas.add(salva.toLowerCase());
	}
	for (const ref of refs) {
		if (resultado[ref.id] || bloqueados.has(ref.id)) continue;
		const nativa = teclaNativaDoMeio(ref.meio, acoes).trim();
		if (!nativa || usadas.has(nativa.toLowerCase())) continue;
		resultado[ref.id] = nativa;
		usadas.add(nativa.toLowerCase());
	}
	return resultado;
}

export function conflitosTeclasMeios(meios: MapaTeclasMeios): string[][] {
	const porTecla = new Map<string, string[]>();
	for (const [id, tecla] of Object.entries(meios)) {
		const chave = tecla.trim().toLowerCase();
		if (!chave) continue;
		const lista = porTecla.get(chave) ?? [];
		lista.push(id);
		porTecla.set(chave, lista);
	}
	return [...porTecla.values()].filter((lista) => lista.length > 1);
}

export function conflitosTeclas(
	mapa: MapaTeclasFuncao,
	escopo: AcaoTecla[],
): AcaoTecla[][] {
	const porTecla = new Map<string, AcaoTecla[]>();
	for (const acao of escopo) {
		const tecla = mapa[acao].toLowerCase();
		const lista = porTecla.get(tecla) ?? [];
		lista.push(acao);
		porTecla.set(tecla, lista);
	}
	return [...porTecla.values()].filter((lista) => lista.length > 1);
}

export function ehAcaoTecla(valor: string): valor is AcaoTecla {
	return ACOES_SET.has(valor);
}

export function teclaCorresponde(
	evento: KeyboardEvent,
	hotkey: string,
): boolean {
	return Boolean(hotkey) && evento.key.toLowerCase() === hotkey.toLowerCase();
}
