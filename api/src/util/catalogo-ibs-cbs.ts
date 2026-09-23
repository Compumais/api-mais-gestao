import conteudoCst from "../data/ibscbs/cstibscbsdetalhada.json" with {
	type: "json",
};
import conteudoClassificacao from "../data/ibscbs/classificacaotributariaibscbs.json" with {
	type: "json",
};

export type CstIbsCbs = {
	id: number;
	cst: string;
	grupoibscbs: number;
	grupoibsmonofasico: number;
	gruporeducaoaliquota: number;
	grupoinformacoesdiferimento: number;
	grupotransferenciacredito: number;
	grupocredpresibszfm: number;
	grupoajustecompetencia: number;
	currenttimemillis: number;
};

export type ClassificacaoIbsCbs = {
	id: number;
	cst: string;
	codigo: string;
	nome: string;
	descricao: string;
	lcredacao: string;
	lc214_215: string;
	tipoaliquota: number;
	percentualreducaoibs: number;
	percentualreducaocbs: number;
	redutorbasecalculo: number;
	grupotributacaoregular: number;
	creditopresumido: number;
	monofasico: number;
	monofasicoretencao: number;
	monofasicoretidoanteriormente: number;
	monofasicodiferido: number;
	datainiciovigencia: string;
	datafimvigencia: string | null;
	dataatualizacao: string;
	grupoestornocredito: number;
	creditopara: string;
	nfea: number;
	nfe: number;
	nfce: number;
	cte: number;
	cteos: number;
	bpe: number;
	bpeta: number;
	bpetm: number;
	nf3e: number;
	nfse: number;
	nfsevia: number;
	nfcom: number;
	nfag: number;
	nfgas: number;
	dere: number;
	anexo: string;
	link: string;
	currenttimemillis: number;
};

export type DocumentoIbsCbs = "nfe" | "nfce" | "todos";

export type ListarClassificacoesIbsCbsFiltro = {
	cst?: string | null;
	documento?: DocumentoIbsCbs;
	somenteVigentes?: boolean;
};

type ArquivoCst = {
	cstibscbsdetalhada: CstIbsCbs[];
};

type ArquivoClassificacao = {
	classificacaotributariaibscbs: ClassificacaoIbsCbs[];
};

const csts = (conteudoCst as ArquivoCst).cstibscbsdetalhada;
const classificacoes = (conteudoClassificacao as ArquivoClassificacao)
	.classificacaotributariaibscbs;

/** Alíquotas de referência do período de transição (LC 214/2025 — 2026). */
export const ALIQUOTA_PADRAO_TRANSICAO_IBS = 0.1;
export const ALIQUOTA_PADRAO_TRANSICAO_CBS = 0.9;

export type AliquotasSugeridasIbsCbs = {
	aliquotaiibs: string;
	aliquotacbs: string;
};

function formatarAliquota(valor: number): string {
	return valor.toFixed(4);
}

function aplicarReducaoAliquota(base: number, percentualReducao: number): number {
	const reducao = Math.min(Math.max(Number(percentualReducao) || 0, 0), 100);
	return Math.round(base * (1 - reducao / 100) * 10_000) / 10_000;
}

/**
 * Sugere alíquotas efetivas a partir do tipo/redução da classificação.
 * tipoaliquota 3 = zero/isenção/não incidência.
 */
export function calcularAliquotasSugeridasIbsCbs(params: {
	tipoaliquota?: number | null;
	percentualreducaoibs?: number | null;
	percentualreducaocbs?: number | null;
}): AliquotasSugeridasIbsCbs {
	const tipo = Number(params.tipoaliquota) || 0;
	if (tipo === 3) {
		return {
			aliquotaiibs: formatarAliquota(0),
			aliquotacbs: formatarAliquota(0),
		};
	}

	return {
		aliquotaiibs: formatarAliquota(
			aplicarReducaoAliquota(
				ALIQUOTA_PADRAO_TRANSICAO_IBS,
				Number(params.percentualreducaoibs) || 0,
			),
		),
		aliquotacbs: formatarAliquota(
			aplicarReducaoAliquota(
				ALIQUOTA_PADRAO_TRANSICAO_CBS,
				Number(params.percentualreducaocbs) || 0,
			),
		),
	};
}

export type ClassificacaoIbsCbsListItem = {
	cst: string;
	codigo: string;
	nome: string;
	descricao: string;
	nfe: boolean;
	nfce: boolean;
	tipoaliquota: number;
	percentualreducaoibs: number;
	percentualreducaocbs: number;
	aliquotaiibs: string;
	aliquotacbs: string;
};

function normalizarCst(cst: string | number | null | undefined): string {
	const digitos = String(cst ?? "").replace(/\D/g, "");
	if (!digitos) {
		return "";
	}
	return digitos.padStart(3, "0").slice(-3);
}

function normalizarCodigo(
	codigo: string | number | null | undefined,
): string {
	const digitos = String(codigo ?? "").replace(/\D/g, "");
	if (!digitos) {
		return "";
	}
	return digitos.padStart(6, "0").slice(-6);
}

export function normalizarCstIbsCbs(
	valor?: string | number | null,
): string | null {
	const normalizado = normalizarCst(valor);
	return normalizado || null;
}

export function normalizarClassTribIbsCbs(
	valor?: string | number | null,
): string | null {
	const normalizado = normalizarCodigo(valor);
	return normalizado || null;
}

function dataHojeSaoPaulo(): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

function estaVigente(
	registro: Pick<
		ClassificacaoIbsCbs,
		"datainiciovigencia" | "datafimvigencia"
	>,
	hoje: string = dataHojeSaoPaulo(),
): boolean {
	const inicio = registro.datainiciovigencia?.slice(0, 10) ?? "";
	const fim = registro.datafimvigencia?.slice(0, 10) ?? null;

	if (inicio && hoje < inicio) {
		return false;
	}
	if (fim && hoje > fim) {
		return false;
	}
	return true;
}

function nomePadraoDoCst(cst: string): string {
	const primeira = classificacoes.find(
		(item) => normalizarCst(item.cst) === cst,
	);
	return primeira?.nome?.trim() || cst;
}

export function listarCstIbsCbs(): Array<{
	cst: string;
	label: string;
	nome: string;
	grupoibscbs: number;
	grupoibsmonofasico: number;
	gruporeducaoaliquota: number;
}> {
	return csts
		.map((item) => {
			const cst = normalizarCst(item.cst);
			const nome = nomePadraoDoCst(cst);
			return {
				cst,
				nome,
				label: `${cst} - ${nome}`,
				grupoibscbs: item.grupoibscbs,
				grupoibsmonofasico: item.grupoibsmonofasico,
				gruporeducaoaliquota: item.gruporeducaoaliquota,
			};
		})
		.sort((a, b) => a.cst.localeCompare(b.cst));
}

export function listarClassificacoesIbsCbs(
	filtro: ListarClassificacoesIbsCbsFiltro = {},
): ClassificacaoIbsCbsListItem[] {
	const cstFiltro = filtro.cst ? normalizarCst(filtro.cst) : null;
	const documento = filtro.documento ?? "todos";
	const somenteVigentes = filtro.somenteVigentes ?? true;
	const hoje = dataHojeSaoPaulo();

	return classificacoes
		.map((item) => {
			const percentualreducaoibs = Number(item.percentualreducaoibs) || 0;
			const percentualreducaocbs = Number(item.percentualreducaocbs) || 0;
			const tipoaliquota = Number(item.tipoaliquota) || 0;
			const aliquotas = calcularAliquotasSugeridasIbsCbs({
				tipoaliquota,
				percentualreducaoibs,
				percentualreducaocbs,
			});
			return {
				cst: normalizarCst(item.cst),
				codigo: normalizarCodigo(item.codigo),
				nome: item.nome?.trim() || item.codigo,
				descricao: item.descricao?.trim() || item.nome?.trim() || "",
				nfe: item.nfe === 1,
				nfce: item.nfce === 1,
				tipoaliquota,
				percentualreducaoibs,
				percentualreducaocbs,
				aliquotaiibs: aliquotas.aliquotaiibs,
				aliquotacbs: aliquotas.aliquotacbs,
				datainiciovigencia: item.datainiciovigencia,
				datafimvigencia: item.datafimvigencia,
				nfeFlag: item.nfe,
				nfceFlag: item.nfce,
			};
		})
		.filter((item) => {
			if (cstFiltro && item.cst !== cstFiltro) {
				return false;
			}
			if (documento === "nfe" && item.nfeFlag !== 1) {
				return false;
			}
			if (documento === "nfce" && item.nfceFlag !== 1) {
				return false;
			}
			if (
				somenteVigentes &&
				!estaVigente(
					{
						datainiciovigencia: item.datainiciovigencia,
						datafimvigencia: item.datafimvigencia,
					},
					hoje,
				)
			) {
				return false;
			}
			return true;
		})
		.map(
			({
				datainiciovigencia: _d,
				datafimvigencia: _f,
				nfeFlag: _n,
				nfceFlag: _c,
				...rest
			}) => rest,
		)
		.sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export function buscarCstIbsCbs(cst?: string | null): {
	cst: string;
	label: string;
} | null {
	const cstNormalizado = normalizarCstIbsCbs(cst);
	if (!cstNormalizado) return null;
	return listarCstIbsCbs().find((item) => item.cst === cstNormalizado) ?? null;
}

export function buscarClassificacaoIbsCbs(
	codigo?: string | number | null,
): ClassificacaoIbsCbsListItem | null {
	const codigoNormalizado = normalizarClassTribIbsCbs(codigo);
	if (!codigoNormalizado) {
		return null;
	}

	return (
		listarClassificacoesIbsCbs({
			documento: "todos",
			somenteVigentes: false,
		}).find((item) => item.codigo === codigoNormalizado) ?? null
	);
}

export function validarCstEClassificacaoIbsCbs(
	cst?: string | number | null,
	codigo?: string | number | null,
	documento: DocumentoIbsCbs = "todos",
):
	| { ok: true; cst: string; codigo: string }
	| { ok: false; message: string } {
	const cstNormalizado = normalizarCstIbsCbs(cst);
	const codigoNormalizado = normalizarClassTribIbsCbs(codigo);

	if (!cstNormalizado && !codigoNormalizado) {
		return { ok: false, message: "CST IBS/CBS e classificação não informados" };
	}

	if (codigoNormalizado && !cstNormalizado) {
		return {
			ok: false,
			message: "Informe o CST IBS/CBS junto com a classificação tributária",
		};
	}

	if (cstNormalizado && !buscarCstIbsCbs(cstNormalizado)) {
		return { ok: false, message: `CST IBS/CBS inválido: ${cstNormalizado}` };
	}

	if (!codigoNormalizado) {
		return {
			ok: false,
			message: "Informe a classificação tributária IBS/CBS (cClassTrib)",
		};
	}

	const classificacao = listarClassificacoesIbsCbs({
		cst: cstNormalizado,
		documento,
		somenteVigentes: false,
	}).find((item) => item.codigo === codigoNormalizado);

	if (!classificacao) {
		const existente = buscarClassificacaoIbsCbs(codigoNormalizado);
		if (existente && existente.cst !== cstNormalizado) {
			return {
				ok: false,
				message: `Classificação ${codigoNormalizado} pertence ao CST ${existente.cst}, não ao ${cstNormalizado}`,
			};
		}
		if (existente && documento === "nfe" && !existente.nfe) {
			return {
				ok: false,
				message: `Classificação ${codigoNormalizado} não se aplica a NF-e`,
			};
		}
		if (existente && documento === "nfce" && !existente.nfce) {
			return {
				ok: false,
				message: `Classificação ${codigoNormalizado} não se aplica a NFC-e`,
			};
		}
		return {
			ok: false,
			message: `Classificação tributária IBS/CBS inválida: ${codigoNormalizado}`,
		};
	}

	return {
		ok: true,
		cst: cstNormalizado as string,
		codigo: codigoNormalizado,
	};
}
