import type { ItemNfe } from "@/schemas/nfe-emissao.schema";
import { formatarCstProduto } from "@/util/cst-produto-util";

export function empresaUsaCsosn(crt?: number | null): boolean {
	return crt === 1 || crt === 2 || crt === 4;
}

export function ehCsosn(codigo: string): boolean {
	return (
		codigo.length === 3 &&
		(codigo.startsWith("1") ||
			codigo.startsWith("2") ||
			codigo.startsWith("5") ||
			codigo.startsWith("9"))
	);
}

function mapearSituacaoTributaria(
	situacao: string | null | undefined,
	usaCsosn: boolean,
): Pick<ItemNfe, "cst" | "csosn"> {
	if (!situacao?.trim()) {
		return {};
	}

	const codigo = situacao.trim().replace(/\D/g, "");
	if (!codigo) return {};

	if (usaCsosn) {
		if (codigo.length === 3 && ehCsosn(codigo)) {
			return { csosn: codigo };
		}
		return {};
	}

	if (codigo.length === 3 && ehCsosn(codigo)) {
		return {};
	}

	const cst = formatarCstProduto(codigo, 2);
	return cst ? { cst } : {};
}

function resolverTributacaoIcms(
	produto: {
		situacaotributaria?: string | null;
		situacaotributariasn?: string | null;
		tributacaoespecial?: string | null;
		tributacaosn?: string | null;
	},
	usaCsosn: boolean,
): Pick<ItemNfe, "cst" | "csosn"> {
	const candidatos = usaCsosn
		? [
				produto.situacaotributariasn,
				produto.tributacaosn,
				produto.situacaotributaria,
				produto.tributacaoespecial,
			]
		: [
				produto.situacaotributaria,
				produto.tributacaoespecial,
				produto.situacaotributariasn,
				produto.tributacaosn,
			];

	for (const valor of candidatos) {
		const tributacao = mapearSituacaoTributaria(valor, usaCsosn);
		if (tributacao.cst || tributacao.csosn) {
			return tributacao;
		}
	}

	return {};
}

export function mapearTributacaoCfopParaItem(
	tributacao: {
		situacaotributaria?: string | null;
		situacaotributariasn?: string | null;
		tributacaoespecial?: string | null;
		tributacaosn?: string | null;
	},
	usaCsosn: boolean,
): Pick<ItemNfe, "cst" | "csosn"> {
	const candidatos = usaCsosn
		? [
				tributacao.situacaotributariasn,
				tributacao.tributacaosn,
				tributacao.situacaotributaria,
				tributacao.tributacaoespecial,
			]
		: [
				tributacao.situacaotributaria,
				tributacao.tributacaoespecial,
				tributacao.situacaotributariasn,
				tributacao.tributacaosn,
			];

	for (const valor of candidatos) {
		const resultado = mapearSituacaoTributaria(valor, usaCsosn);
		if (resultado.cst || resultado.csosn) {
			return resultado;
		}
	}

	return {};
}

export function normalizarTributacaoItemFormulario(
	item: ItemNfe,
	usaCsosn: boolean,
): Pick<ItemNfe, "cst" | "csosn"> {
	if (usaCsosn) {
		const csosn =
			item.csosn?.trim() ||
			(item.cst?.trim() && ehCsosn(item.cst.trim()) ? item.cst.trim() : undefined) ||
			"102";
		return { csosn, cst: undefined };
	}

	const cst =
		item.cst?.trim() ||
		(item.csosn?.trim() && !ehCsosn(item.csosn.trim())
			? formatarCstProduto(item.csosn, 2)
			: undefined) ||
		"00";

	return { cst, csosn: undefined };
}

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function paraNumeroOpcional(valor: unknown): number | undefined {
	if (valor == null || valor === "") return undefined;
	const numero = typeof valor === "number" ? valor : Number(valor);
	return Number.isFinite(numero) ? numero : undefined;
}

function extrairTributacaoItemEmissaoSalva(dadosimportacao: unknown) {
	if (!dadosimportacao || typeof dadosimportacao !== "object") {
		return undefined;
	}

	const emissao = (dadosimportacao as { emissao?: Record<string, unknown> }).emissao;
	if (!emissao || typeof emissao !== "object") {
		return undefined;
	}

	return emissao;
}

export function mapearItemNotaReemissaoParaForm(
	item: Record<string, unknown>,
	usaCsosn: boolean,
): ItemNfe {
	const quantidadeBruta = Number(item.quantidade ?? 1);
	const valorBruto = Number(item.precounitario ?? 0);
	const idprodutoRaw = item.idproduto ? String(item.idproduto) : undefined;
	const ncmDigitos = String(item.ncm ?? "").replace(/\D/g, "");
	const tributacaoSalva = extrairTributacaoItemEmissaoSalva(item.dadosimportacao);
	const tributacaoImportacao = (
		item.dadosimportacao as { tributacao?: Record<string, unknown> } | null
	)?.tributacao;

	return prepararItemEmissaoFormulario(
		{
			idproduto:
				idprodutoRaw && UUID_REGEX.test(idprodutoRaw)
					? idprodutoRaw
					: undefined,
			descricao: String(item.descricao ?? "").trim(),
			ncm: (ncmDigitos || "00000000").padStart(8, "0").slice(0, 8),
			cfop: String(item.cfop ?? "").replace(/\D/g, "").slice(0, 4),
			unidade: String(item.unidade ?? "UN").trim() || "UN",
			quantidade:
				Number.isFinite(quantidadeBruta) && quantidadeBruta > 0
					? quantidadeBruta
					: 1,
			valorUnitario:
				Number.isFinite(valorBruto) && valorBruto > 0 ? valorBruto : 0.01,
			cst: item.situacaotributaria
				? String(item.situacaotributaria).trim()
				: undefined,
			cest: (() => {
				const cestSalvo = tributacaoSalva?.cest
					? String(tributacaoSalva.cest).replace(/\D/g, "")
					: "";
				return cestSalvo.length === 7 ? cestSalvo : undefined;
			})(),
			orig: Number(item.origem ?? 0) || 0,
			cstPis: item.cstpis ? String(item.cstpis).trim() : undefined,
			cstCofins: item.cstcofins ? String(item.cstcofins).trim() : undefined,
			aliquotaPis: paraNumeroOpcional(item.aliquotapis),
			aliquotaCofins: paraNumeroOpcional(item.aliquotacofins),
			baseIcms:
				paraNumeroOpcional(item.baseicms) ??
				paraNumeroOpcional(tributacaoImportacao?.baseicms),
			aliquotaIcms:
				paraNumeroOpcional(item.percentualicms) ??
				paraNumeroOpcional(tributacaoImportacao?.percentualicms),
			valorIcms:
				paraNumeroOpcional(item.icms) ??
				paraNumeroOpcional(tributacaoImportacao?.icms),
			valorIpi:
				paraNumeroOpcional(item.ipi) ??
				paraNumeroOpcional(tributacaoSalva?.valorIpi) ??
				paraNumeroOpcional(tributacaoImportacao?.ipi),
			valorIpiDevol:
				paraNumeroOpcional(tributacaoSalva?.valorIpiDevol) ??
				paraNumeroOpcional(tributacaoImportacao?.ipi),
			baseIcmsSt:
				paraNumeroOpcional(tributacaoSalva?.baseIcmsSt) ??
				paraNumeroOpcional(tributacaoImportacao?.baseicmsst),
			valorIcmsSt:
				paraNumeroOpcional(tributacaoSalva?.valorIcmsSt) ??
				paraNumeroOpcional(tributacaoImportacao?.icmsst),
			valorFcpSt:
				paraNumeroOpcional(tributacaoSalva?.valorFcpSt) ??
				paraNumeroOpcional(tributacaoImportacao?.fcpst),
			valorFcpStRet: paraNumeroOpcional(tributacaoSalva?.valorFcpStRet),
			valorIcmsDesonerado: paraNumeroOpcional(
				tributacaoSalva?.valorIcmsDesonerado,
			),
			valorIcmsMonoRet: paraNumeroOpcional(tributacaoSalva?.valorIcmsMonoRet),
			valorIcmsMonoReten: paraNumeroOpcional(
				tributacaoSalva?.valorIcmsMonoReten,
			),
		},
		usaCsosn,
	);
}

export function prepararItemEmissaoFormulario(
	item: ItemNfe,
	usaCsosn: boolean,
): ItemNfe {
	const tributacao = normalizarTributacaoItemFormulario(item, usaCsosn);

	return {
		...item,
		...tributacao,
		descricao: String(item.descricao ?? ""),
		ncm: String(item.ncm ?? ""),
		cest: item.cest?.replace(/\D/g, "").slice(0, 7) || undefined,
		cfop: String(item.cfop ?? ""),
		unidade: String(item.unidade ?? "UN"),
		quantidade: Number(item.quantidade) || 0,
		valorUnitario: Number(item.valorUnitario) || 0,
		aliquotaPis:
			item.aliquotaPis != null ? Number(item.aliquotaPis) : undefined,
		aliquotaCofins:
			item.aliquotaCofins != null ? Number(item.aliquotaCofins) : undefined,
		baseIcms: item.baseIcms != null ? Number(item.baseIcms) : undefined,
		aliquotaIcms:
			item.aliquotaIcms != null ? Number(item.aliquotaIcms) : undefined,
		valorIcms: item.valorIcms != null ? Number(item.valorIcms) : undefined,
		valorIpi: item.valorIpi != null ? Number(item.valorIpi) : undefined,
		valorIpiDevol:
			item.valorIpiDevol != null ? Number(item.valorIpiDevol) : undefined,
		baseIcmsSt: item.baseIcmsSt != null ? Number(item.baseIcmsSt) : undefined,
		valorIcmsSt:
			item.valorIcmsSt != null ? Number(item.valorIcmsSt) : undefined,
		valorFcpSt: item.valorFcpSt != null ? Number(item.valorFcpSt) : undefined,
		valorFcpStRet:
			item.valorFcpStRet != null ? Number(item.valorFcpStRet) : undefined,
		valorIcmsDesonerado:
			item.valorIcmsDesonerado != null
				? Number(item.valorIcmsDesonerado)
				: undefined,
		valorIcmsMonoRet:
			item.valorIcmsMonoRet != null ? Number(item.valorIcmsMonoRet) : undefined,
		valorIcmsMonoReten:
			item.valorIcmsMonoReten != null
				? Number(item.valorIcmsMonoReten)
				: undefined,
	};
}

const CST_COM_ST = new Set(["10", "30", "60", "70"]);
const CSOSN_COM_ST = new Set(["201", "202", "203", "500"]);

export function itemEmissaoRequerCest(item: ItemNfe): boolean {
	const cst = item.cst?.replace(/\D/g, "") ?? "";
	const csosn = item.csosn?.replace(/\D/g, "") ?? "";
	if (CST_COM_ST.has(cst) || CSOSN_COM_ST.has(csosn)) {
		return true;
	}
	return (item.baseIcmsSt ?? 0) > 0 || (item.valorIcmsSt ?? 0) > 0;
}

export function itemEmissaoPodeSerConfirmado(
	item: ItemNfe,
	usaCsosn: boolean,
): boolean {
	const preparado = prepararItemEmissaoFormulario(item, usaCsosn);
	const tributacao = normalizarTributacaoItemFormulario(preparado, usaCsosn);
	const cestOk =
		!itemEmissaoRequerCest({ ...preparado, ...tributacao }) ||
		Boolean(preparado.cest?.replace(/\D/g, "").length === 7);

	return (
		preparado.descricao.trim() !== "" &&
		preparado.ncm.trim() !== "" &&
		preparado.cfop.trim().length >= 4 &&
		preparado.quantidade > 0 &&
		preparado.valorUnitario > 0 &&
		(usaCsosn
			? Boolean(tributacao.csosn?.trim())
			: Boolean(tributacao.cst?.trim())) &&
		cestOk
	);
}

export function normalizarGtinItemFormulario(
	item: ItemNfe,
): Pick<ItemNfe, "ean" | "eanTributavel"> {
	const eanRaw = item.ean?.trim();
	if (!eanRaw || eanRaw.toUpperCase() === "SEM GTIN") {
		return { ean: undefined, eanTributavel: undefined };
	}

	const eanTributavelRaw = item.eanTributavel?.trim();
	const eanTributavel =
		eanTributavelRaw && eanTributavelRaw.toUpperCase() !== "SEM GTIN"
			? eanTributavelRaw
			: eanRaw;

	return { ean: eanRaw, eanTributavel };
}

export function mapearProdutoParaItemNfe(
	produto: {
		id: string;
		codigo?: number | null;
		ean?: number | string | null;
		eantributavel?: string | null;
		nome: string;
		ncm?: string | null;
		cestCodigo?: string | null;
		cest?: string | number | null;
		preco?: string | null;
		origem?: number | null;
		situacaotributaria?: string | null;
		situacaotributariasn?: string | null;
		tributacaoespecial?: string | null;
		tributacaosn?: string | null;
		cstpis?: string | number | null;
		cstcofins?: string | number | null;
	},
	cfop?: string,
	usaCsosn = false,
): ItemNfe {
	const tributacao = resolverTributacaoIcms(produto, usaCsosn);

	const ean =
		produto.ean != null && String(produto.ean).trim() !== ""
			? String(produto.ean).replace(/\D/g, "")
			: undefined;
	const eanTributavel =
		produto.eantributavel?.trim() ||
		(ean && ean.length >= 8 ? ean : undefined);

	const rawCest = produto.cestCodigo ?? produto.cest;
	const digitosCest =
		rawCest != null && String(rawCest).trim() !== ""
			? String(rawCest).replace(/\D/g, "")
			: "";
	const cest =
		digitosCest.length === 7
			? digitosCest
			: typeof produto.cest === "number" &&
					digitosCest.length > 0 &&
					digitosCest.length < 7
				? digitosCest.padStart(7, "0")
				: undefined;

	return {
		idproduto: produto.id,
		codigoProduto:
			produto.codigo != null ? String(produto.codigo) : undefined,
		ean,
		eanTributavel,
		descricao: produto.nome,
		ncm: produto.ncm ?? "",
		...(cest ? { cest } : {}),
		cfop: cfop ?? "",
		unidade: "UN",
		quantidade: 1,
		valorUnitario: produto.preco ? parseFloat(produto.preco) : 0,
		orig: produto.origem ?? 0,
		...tributacao,
		cstPis:
			produto.cstpis != null
				? formatarCstProduto(produto.cstpis, 2)
				: undefined,
		cstCofins:
			produto.cstcofins != null
				? formatarCstProduto(produto.cstcofins, 2)
				: undefined,
	};
}
