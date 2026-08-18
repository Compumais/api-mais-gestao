export const CHAVE_TECLAS_FUNCAO = "teclas_funcao";

export const ACOES_TECLA = [
	"finalizar",
	"receber",
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
	dinheiro: "Dinheiro (pagamento)",
	pix: "PIX (pagamento)",
	cartao: "Cartão (pagamento)",
	fechar_caixa: "Fechar caixa",
	sair: "Sair",
	sincronizar: "Sincronizar",
	historico: "Histórico",
};

const ACOES_SET = new Set<string>(ACOES_TECLA);

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
	let origem: Record<string, unknown> = {};
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				origem = parsed as Record<string, unknown>;
			}
		} catch {
			return mapa;
		}
	} else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		origem = raw as Record<string, unknown>;
	}

	for (const acao of ACOES_TECLA) {
		const valor = origem[acao];
		if (typeof valor === "string" && valor.trim()) {
			mapa[acao] = valor.trim();
		}
	}
	return mapa;
}

export function serializarTeclasFuncao(mapa: MapaTeclasFuncao): string {
	return JSON.stringify(mapa);
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
