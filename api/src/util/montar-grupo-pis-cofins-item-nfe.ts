/**
 * Grupo PIS/COFINS do item (leiaute NF-e): o XSD exige exatamente um filho
 * em imposto/PIS e imposto/COFINS. CST vazio ou não mapeado gera <PIS></PIS>
 * e rejeição SEFAZ (pré-visualização e autorização).
 *
 * Fallback: CST 07 + PISNT/COFINSNT (só CST). Já era o default do montador
 * (`cstPis ?? "07"`) e da NF-e de homologação — não afirma operação
 * tributada com alíquota inventada.
 */

export const CST_PIS_COFINS_FALLBACK_NT = "07";

export type GrupoPisCofinsNfe = "aliq" | "qtde" | "nt" | "outr";

export type GrupoXmlPisNfe = "PISAliq" | "PISQtde" | "PISNT" | "PISOutr";
export type GrupoXmlCofinsNfe =
	| "COFINSAliq"
	| "COFINSQtde"
	| "COFINSNT"
	| "COFINSOutr";

const CST_ALIQ = new Set(["01", "02"]);
const CST_QTDE = new Set(["03"]);
const CST_NT = new Set(["04", "05", "06", "07", "08", "09"]);
const CST_OUTR = new Set([
	"49",
	"50",
	"51",
	"52",
	"53",
	"54",
	"55",
	"56",
	"60",
	"61",
	"62",
	"63",
	"64",
	"65",
	"66",
	"67",
	"70",
	"71",
	"72",
	"73",
	"74",
	"75",
	"98",
	"99",
]);

export type MontagemPisItemNfe = {
	cst: string;
	grupo: GrupoPisCofinsNfe;
	grupoXml: GrupoXmlPisNfe;
	vBC: number;
	pPIS: number;
	vPIS: number;
	qBCProd?: number;
	vAliqProd?: number;
};

export type MontagemCofinsItemNfe = {
	cst: string;
	grupo: GrupoPisCofinsNfe;
	grupoXml: GrupoXmlCofinsNfe;
	vBC: number;
	pCOFINS: number;
	vCOFINS: number;
	qBCProd?: number;
	vAliqProd?: number;
};

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function round4(value: number): number {
	return Math.round(value * 10000) / 10000;
}

function paraNumero(valor?: number | string | null): number {
	if (valor == null || valor === "") return 0;
	const numero = typeof valor === "number" ? valor : Number(valor);
	return Number.isFinite(numero) ? numero : 0;
}

/**
 * CST PIS/COFINS em 2 dígitos.
 * Cadastro de produto guarda CST em coluna numeric (`1.00` = CST 01):
 * não extrair só dígitos (`"1.00"` → `"00"`), usar a parte inteira.
 */
export function normalizarCstPisCofins(
	valor?: string | number | null,
): string | undefined {
	if (valor == null || valor === "") return undefined;

	if (typeof valor === "number") {
		if (!Number.isFinite(valor) || valor < 0 || valor > 99) return undefined;
		return String(Math.trunc(valor)).padStart(2, "0");
	}

	const texto = String(valor).trim();
	if (!texto) return undefined;

	const comPonto = texto.replace(",", ".");
	if (/^-?\d+(\.\d+)?$/.test(comPonto)) {
		const numero = Number(comPonto);
		if (!Number.isFinite(numero) || numero < 0 || numero > 99) {
			return undefined;
		}
		return String(Math.trunc(numero)).padStart(2, "0");
	}

	const digitos = texto.replace(/\D/g, "");
	if (!digitos) return undefined;
	if (digitos.length === 1) return digitos.padStart(2, "0");
	return digitos.slice(-2);
}

export function resolverGrupoPisCofins(
	cst: string,
): GrupoPisCofinsNfe | undefined {
	if (CST_ALIQ.has(cst)) return "aliq";
	if (CST_QTDE.has(cst)) return "qtde";
	if (CST_NT.has(cst)) return "nt";
	if (CST_OUTR.has(cst)) return "outr";
	return undefined;
}

export function cstPisCofinsAusenteOuInvalido(
	valor?: string | number | null,
): boolean {
	const cst = normalizarCstPisCofins(valor);
	if (!cst) return true;
	return resolverGrupoPisCofins(cst) == null;
}

function resolverCstComFallback(valor?: string | number | null): {
	cst: string;
	grupo: GrupoPisCofinsNfe;
} {
	const cst = normalizarCstPisCofins(valor);
	const grupo = cst ? resolverGrupoPisCofins(cst) : undefined;
	if (cst && grupo) {
		return { cst, grupo };
	}
	return { cst: CST_PIS_COFINS_FALLBACK_NT, grupo: "nt" };
}

function grupoXmlPis(grupo: GrupoPisCofinsNfe): GrupoXmlPisNfe {
	if (grupo === "aliq") return "PISAliq";
	if (grupo === "qtde") return "PISQtde";
	if (grupo === "nt") return "PISNT";
	return "PISOutr";
}

function grupoXmlCofins(grupo: GrupoPisCofinsNfe): GrupoXmlCofinsNfe {
	if (grupo === "aliq") return "COFINSAliq";
	if (grupo === "qtde") return "COFINSQtde";
	if (grupo === "nt") return "COFINSNT";
	return "COFINSOutr";
}

export function montarPisItemNfe(params: {
	cstPis?: string | number | null;
	aliquotaPis?: number | string | null;
	valorProduto: number;
	quantidade: number;
}): MontagemPisItemNfe {
	const { cst, grupo } = resolverCstComFallback(params.cstPis);
	const aliquota = paraNumero(params.aliquotaPis);
	const vProd = round2(params.valorProduto);
	const quantidade = params.quantidade > 0 ? params.quantidade : 0;

	if (grupo === "aliq") {
		const vPIS = round2((vProd * aliquota) / 100);
		return {
			cst,
			grupo,
			grupoXml: grupoXmlPis(grupo),
			vBC: vProd,
			pPIS: round4(aliquota),
			vPIS,
		};
	}

	if (grupo === "qtde") {
		const vPIS = round2(quantidade * aliquota);
		return {
			cst,
			grupo,
			grupoXml: grupoXmlPis(grupo),
			vBC: 0,
			pPIS: 0,
			vPIS,
			qBCProd: round4(quantidade),
			vAliqProd: round4(aliquota),
		};
	}

	if (grupo === "outr") {
		const vPIS = round2((vProd * aliquota) / 100);
		return {
			cst,
			grupo,
			grupoXml: grupoXmlPis(grupo),
			vBC: vProd,
			pPIS: round4(aliquota),
			vPIS,
		};
	}

	return {
		cst,
		grupo,
		grupoXml: grupoXmlPis(grupo),
		vBC: 0,
		pPIS: 0,
		vPIS: 0,
	};
}

export function montarCofinsItemNfe(params: {
	cstCofins?: string | number | null;
	aliquotaCofins?: number | string | null;
	valorProduto: number;
	quantidade: number;
}): MontagemCofinsItemNfe {
	const { cst, grupo } = resolverCstComFallback(params.cstCofins);
	const aliquota = paraNumero(params.aliquotaCofins);
	const vProd = round2(params.valorProduto);
	const quantidade = params.quantidade > 0 ? params.quantidade : 0;

	if (grupo === "aliq") {
		const vCOFINS = round2((vProd * aliquota) / 100);
		return {
			cst,
			grupo,
			grupoXml: grupoXmlCofins(grupo),
			vBC: vProd,
			pCOFINS: round4(aliquota),
			vCOFINS,
		};
	}

	if (grupo === "qtde") {
		const vCOFINS = round2(quantidade * aliquota);
		return {
			cst,
			grupo,
			grupoXml: grupoXmlCofins(grupo),
			vBC: 0,
			pCOFINS: 0,
			vCOFINS,
			qBCProd: round4(quantidade),
			vAliqProd: round4(aliquota),
		};
	}

	if (grupo === "outr") {
		const vCOFINS = round2((vProd * aliquota) / 100);
		return {
			cst,
			grupo,
			grupoXml: grupoXmlCofins(grupo),
			vBC: vProd,
			pCOFINS: round4(aliquota),
			vCOFINS,
		};
	}

	return {
		cst,
		grupo,
		grupoXml: grupoXmlCofins(grupo),
		vBC: 0,
		pCOFINS: 0,
		vCOFINS: 0,
	};
}

export function serializarXmlPis(montagem: MontagemPisItemNfe): string {
	if (montagem.grupo === "aliq") {
		return `<PIS><PISAliq><CST>${montagem.cst}</CST><vBC>${montagem.vBC.toFixed(2)}</vBC><pPIS>${montagem.pPIS}</pPIS><vPIS>${montagem.vPIS.toFixed(2)}</vPIS></PISAliq></PIS>`;
	}
	if (montagem.grupo === "qtde") {
		return `<PIS><PISQtde><CST>${montagem.cst}</CST><qBCProd>${montagem.qBCProd}</qBCProd><vAliqProd>${montagem.vAliqProd}</vAliqProd><vPIS>${montagem.vPIS.toFixed(2)}</vPIS></PISQtde></PIS>`;
	}
	if (montagem.grupo === "outr") {
		return `<PIS><PISOutr><CST>${montagem.cst}</CST><vBC>${montagem.vBC.toFixed(2)}</vBC><pPIS>${montagem.pPIS}</pPIS><vPIS>${montagem.vPIS.toFixed(2)}</vPIS></PISOutr></PIS>`;
	}
	return `<PIS><PISNT><CST>${montagem.cst}</CST></PISNT></PIS>`;
}

export function serializarXmlCofins(montagem: MontagemCofinsItemNfe): string {
	if (montagem.grupo === "aliq") {
		return `<COFINS><COFINSAliq><CST>${montagem.cst}</CST><vBC>${montagem.vBC.toFixed(2)}</vBC><pCOFINS>${montagem.pCOFINS}</pCOFINS><vCOFINS>${montagem.vCOFINS.toFixed(2)}</vCOFINS></COFINSAliq></COFINS>`;
	}
	if (montagem.grupo === "qtde") {
		return `<COFINS><COFINSQtde><CST>${montagem.cst}</CST><qBCProd>${montagem.qBCProd}</qBCProd><vAliqProd>${montagem.vAliqProd}</vAliqProd><vCOFINS>${montagem.vCOFINS.toFixed(2)}</vCOFINS></COFINSQtde></COFINS>`;
	}
	if (montagem.grupo === "outr") {
		return `<COFINS><COFINSOutr><CST>${montagem.cst}</CST><vBC>${montagem.vBC.toFixed(2)}</vBC><pCOFINS>${montagem.pCOFINS}</pCOFINS><vCOFINS>${montagem.vCOFINS.toFixed(2)}</vCOFINS></COFINSOutr></COFINS>`;
	}
	return `<COFINS><COFINSNT><CST>${montagem.cst}</CST></COFINSNT></COFINS>`;
}

export function aplicarPisCofinsItemEmissao<
	T extends {
		quantidade: number;
		valorUnitario: number;
		cstPis?: string;
		cstCofins?: string;
		aliquotaPis?: number;
		aliquotaCofins?: number;
	},
>(item: T): T {
	const valorProduto = round2(item.quantidade * item.valorUnitario);
	const pis = montarPisItemNfe({
		cstPis: item.cstPis,
		aliquotaPis: item.aliquotaPis,
		valorProduto,
		quantidade: item.quantidade,
	});
	const cofins = montarCofinsItemNfe({
		cstCofins: item.cstCofins,
		aliquotaCofins: item.aliquotaCofins,
		valorProduto,
		quantidade: item.quantidade,
	});

	return {
		...item,
		cstPis: pis.cst,
		cstCofins: cofins.cst,
		aliquotaPis: item.aliquotaPis,
		aliquotaCofins: item.aliquotaCofins,
	};
}
