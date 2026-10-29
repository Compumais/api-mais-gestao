export type MeioPagamento = "DINHEIRO" | "PIX" | "CARTAO" | "OUTROS";

export type StatusLancamentoPagamento = "ok" | "pendente" | "cancelado";

export type LancamentoPagamento = {
	id?: string;
	meio: MeioPagamento;
	valor: number;
	nsu?: string | null;
	autorizacao?: string | null;
	bandeira?: string | null;
	status?: StatusLancamentoPagamento;
	descricao?: string | null;
	formapagamentonfe?: string | null;
	idtipodocumentofinanceiro?: string | null;
	aprazo?: number;
};

export type TotaisPagamento = {
	dinheiro: number;
	pix: number;
	cartao: number;
	outros: number;
};

export type PagamentoErpVendaPdv = {
	idtipodocumentofinanceiro: string;
	valor: number;
};

export type ResultadoFechamentoPagamentos = {
	efetivos: LancamentoPagamento[];
	totais: TotaisPagamento;
	troco: number;
	meio: MeioPagamento | "MISTO";
	soma: number;
};

const MEIOS: readonly MeioPagamento[] = ["DINHEIRO", "PIX", "CARTAO", "OUTROS"];
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS: readonly StatusLancamentoPagamento[] = [
	"ok",
	"pendente",
	"cancelado",
];

export function arredondarDinheiro(valor: number): number {
	return Math.round(valor * 100) / 100;
}

export function ehMeioPagamento(valor: unknown): valor is MeioPagamento {
	return (
		typeof valor === "string" &&
		MEIOS.includes(valor.toUpperCase() as MeioPagamento)
	);
}

export function ehStatusLancamento(
	valor: unknown,
): valor is StatusLancamentoPagamento {
	return (
		typeof valor === "string" &&
		STATUS.includes(valor as StatusLancamentoPagamento)
	);
}

export function lancamentoUnico(
	meio: MeioPagamento,
	valor: number,
): LancamentoPagamento {
	return {
		meio,
		valor: arredondarDinheiro(valor),
		status: "ok",
	};
}

export function normalizarMeioPagamento(
	valor: unknown,
	fallback: MeioPagamento = "DINHEIRO",
): MeioPagamento {
	const meio = String(valor ?? "")
		.trim()
		.toUpperCase();
	return ehMeioPagamento(meio) ? meio : fallback;
}

export function normalizarLancamento(raw: unknown): LancamentoPagamento | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return null;
	}
	const item = raw as Record<string, unknown>;
	const meio = String(item.meio ?? "")
		.trim()
		.toUpperCase();
	if (!ehMeioPagamento(meio)) {
		return null;
	}
	const valor = arredondarDinheiro(Number(item.valor ?? 0));
	if (!Number.isFinite(valor) || valor <= 0) {
		return null;
	}
	const statusRaw = item.status ?? "ok";
	const status = ehStatusLancamento(statusRaw) ? statusRaw : "ok";
	const nsu = textoOpcional(item.nsu);
	const autorizacao = textoOpcional(item.autorizacao);
	const bandeira = textoOpcional(item.bandeira);
	const descricao = textoOpcional(item.descricao);
	const formapagamentonfe = textoOpcional(item.formapagamentonfe);
	const idtipodocumentofinanceiro = textoOpcional(
		item.idtipodocumentofinanceiro,
	);
	const aprazo = Number(item.aprazo ?? 0) === 1 ? 1 : 0;
	const id = textoOpcional(item.id);
	return {
		...(id ? { id } : {}),
		meio,
		valor,
		status,
		nsu,
		autorizacao,
		bandeira,
		descricao,
		formapagamentonfe,
		idtipodocumentofinanceiro,
		aprazo,
	};
}

export function normalizarLancamentos(raw: unknown): LancamentoPagamento[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	return raw
		.map(normalizarLancamento)
		.filter((item): item is LancamentoPagamento => item !== null);
}

export function lancamentosDeBody(
	body: Record<string, unknown>,
	fallback?: { meio?: MeioPagamento; valor?: number },
): LancamentoPagamento[] {
	const lista = normalizarLancamentos(body.pagamentos ?? body.lancamentos);
	if (lista.length) {
		return lista;
	}
	if (fallback?.meio && fallback.valor != null && fallback.valor > 0) {
		return [lancamentoUnico(fallback.meio, fallback.valor)];
	}
	const meio = body.meio != null ? normalizarMeioPagamento(body.meio) : null;
	const valor = Number(body.valor ?? 0);
	if (meio && valor > 0) {
		return [lancamentoUnico(meio, valor)];
	}
	return [];
}

export function lancamentosEfetivos(
	lancamentos: LancamentoPagamento[],
): LancamentoPagamento[] {
	return lancamentos.filter((item) => (item.status ?? "ok") === "ok");
}

export function somarLancamentos(lancamentos: LancamentoPagamento[]): number {
	return arredondarDinheiro(
		lancamentosEfetivos(lancamentos).reduce((acc, item) => acc + item.valor, 0),
	);
}

export function totaisPorMeio(
	lancamentos: LancamentoPagamento[],
): TotaisPagamento {
	const totais: TotaisPagamento = {
		dinheiro: 0,
		pix: 0,
		cartao: 0,
		outros: 0,
	};
	for (const item of lancamentosEfetivos(lancamentos)) {
		if (item.meio === "DINHEIRO") {
			totais.dinheiro = arredondarDinheiro(totais.dinheiro + item.valor);
		} else if (item.meio === "PIX") {
			totais.pix = arredondarDinheiro(totais.pix + item.valor);
		} else if (item.meio === "CARTAO") {
			totais.cartao = arredondarDinheiro(totais.cartao + item.valor);
		} else {
			totais.outros = arredondarDinheiro(totais.outros + item.valor);
		}
	}
	return totais;
}

export function meioPrincipal(
	lancamentos: LancamentoPagamento[],
): MeioPagamento | "MISTO" {
	const meios = new Set(
		lancamentosEfetivos(lancamentos).map((item) => item.meio),
	);
	if (meios.size === 1) {
		return [...meios][0] as MeioPagamento;
	}
	if (meios.size > 1) {
		return "MISTO";
	}
	return "DINHEIRO";
}

export function totaisParaSync(
	lancamentos: LancamentoPagamento[],
	troco: number,
): {
	valordinheiro: number;
	valorpix: number;
	valorcartaocredito: number;
	valorcartaodebito: number;
	valorcartao: number;
	valorprepago: number;
	valortroco: number;
} {
	let credito = 0;
	let debito = 0;
	for (const item of lancamentosEfetivos(lancamentos)) {
		if (item.meio !== "CARTAO") continue;
		const tPag = String(item.formapagamentonfe ?? "")
			.replace(/\D/g, "")
			.padStart(2, "0");
		if (tPag === "04") {
			debito = arredondarDinheiro(debito + item.valor);
		} else {
			credito = arredondarDinheiro(credito + item.valor);
		}
	}
	const totais = totaisPorMeio(lancamentos);
	return {
		valordinheiro: totais.dinheiro,
		valorpix: totais.pix,
		valorcartaocredito: credito,
		valorcartaodebito: debito,
		valorcartao: 0,
		valorprepago: totais.outros,
		valortroco: arredondarDinheiro(troco),
	};
}

export function ehPagamentoAPrazo(params: {
	aprazo?: number | string | boolean | null;
	meio?: string | null;
	formapagamentonfe?: string | null;
}): boolean {
	const meio = String(params.meio ?? "")
		.trim()
		.toUpperCase();
	if (meio === "DINHEIRO" || meio === "PIX" || meio === "CARTAO") {
		return false;
	}
	const tPag = String(params.formapagamentonfe ?? "")
		.replace(/\D/g, "")
		.padStart(2, "0");
	if (tPag === "01" || tPag === "17" || tPag === "03" || tPag === "04") {
		return false;
	}
	return Number(params.aprazo) === 1;
}

export function pagamentosErpDosLancamentos(
	lancamentos: LancamentoPagamento[],
): PagamentoErpVendaPdv[] {
	return lancamentosEfetivos(lancamentos)
		.filter(
			(item) =>
				ehPagamentoAPrazo(item) &&
				UUID_RE.test(item.idtipodocumentofinanceiro ?? ""),
		)
		.map((item) => ({
			idtipodocumentofinanceiro: item.idtipodocumentofinanceiro as string,
			valor: item.valor,
		}));
}

export function pagamentosNativosParaApi(
	lancamentos: LancamentoPagamento[],
): Array<LancamentoPagamento & { meio: Exclude<MeioPagamento, "OUTROS"> }> {
	return lancamentosEfetivos(lancamentos).filter(
		(
			item,
		): item is LancamentoPagamento & {
			meio: Exclude<MeioPagamento, "OUTROS">;
		} => item.meio !== "OUTROS",
	);
}

export function validarFechamentoPagamentos(params: {
	total: number;
	lancamentos: LancamentoPagamento[];
	troco?: number;
}): ResultadoFechamentoPagamentos {
	const total = arredondarDinheiro(params.total);
	if (total <= 0) {
		throw new Error("Total da venda inválido");
	}
	if (!params.lancamentos.length) {
		throw new Error("Informe ao menos um lançamento de pagamento");
	}
	if (params.lancamentos.some((item) => (item.status ?? "ok") === "pendente")) {
		throw new Error(
			"Há pagamento pendente; finalize ou cancele antes de fechar",
		);
	}

	const efetivos = lancamentosEfetivos(params.lancamentos);
	if (!efetivos.length) {
		throw new Error("Informe ao menos um lançamento de pagamento");
	}

	const soma = somarLancamentos(efetivos);
	if (soma < total) {
		throw new Error(
			`Pagamento insuficiente: ${soma.toFixed(2)} de ${total.toFixed(2)}`,
		);
	}

	const totais = totaisPorMeio(efetivos);
	const trocoCalculado = arredondarDinheiro(Math.max(0, soma - total));
	const trocoInformado =
		params.troco != null ? arredondarDinheiro(params.troco) : null;
	const troco =
		trocoInformado != null && trocoInformado > 0
			? trocoInformado
			: trocoCalculado;

	if (troco > 0 && totais.dinheiro <= 0) {
		throw new Error("Troco só é permitido em dinheiro");
	}
	if (trocoInformado != null && trocoInformado > 0 && trocoCalculado === 0) {
		if (totais.dinheiro <= 0) {
			throw new Error("Troco só é permitido em dinheiro");
		}
	}

	return {
		efetivos,
		totais,
		troco,
		meio: meioPrincipal(efetivos),
		soma,
	};
}

function textoOpcional(valor: unknown): string | null {
	if (valor == null) {
		return null;
	}
	const texto = String(valor).trim();
	return texto.length ? texto : null;
}
