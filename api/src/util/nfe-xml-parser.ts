import { XMLParser } from "fast-xml-parser";
import { normalizarCodigoBarras, inteiroValidoParaPostgres } from "@/util/texto-util.js";

export type ItemNFeXml = {
	codigoproduto?: number | undefined;
	ean?: string | undefined;
	descricaoproduto: string;
	ncm?: string | undefined;
	cest?: string | undefined;
	cfop?: string | undefined;
	unidade?: string | undefined;
	unidadeTributavel?: string | undefined;
	quantidade?: string | undefined;
	quantidadeTributavel?: string | undefined;
	precounitario?: string | undefined;
	precounitarioTributavel?: string | undefined;
	total?: string | undefined;
	desconto?: string | undefined;
	situacaotributaria?: string | undefined;
	cstpis?: string | undefined;
	cstcofins?: string | undefined;
	baseicms?: string | undefined;
	percentualicms?: string | undefined;
	icms?: string | undefined;
	baseicmsst?: string | undefined;
	icmsst?: string | undefined;
	mvaicmsst?: string | undefined;
	fcpst?: string | undefined;
	aliquotapis?: string | undefined;
	pis?: string | undefined;
	aliquotacofins?: string | undefined;
	cofins?: string | undefined;
	ipi?: string | undefined;
	cstipi?: string | undefined;
	enquadramentoipi?: string | undefined;
	origem?: number | undefined;
	referenciafornecedor?: string | undefined;
	informacaoadicional?: string | undefined;
	rastros?: RastroNFeXml[] | undefined;
};

export type RastroNFeXml = {
	numeroLote?: string | undefined;
	quantidadeLote?: string | undefined;
	dataFabricacao?: string | undefined;
	dataValidade?: string | undefined;
	codigoAgregacao?: string | undefined;
};

export type DuplicataNFeXml = {
	numero?: string | undefined;
	vencimento?: string | undefined;
	valor?: string | undefined;
};

export type NFeXmlParsed = {
	chavenfe?: string | undefined;
	numero?: string | undefined;
	numeronotafiscal?: string | undefined;
	serie?: string | undefined;
	modelo?: string | undefined;
	emissao?: string | undefined;
	entradasaida?: string | undefined;
	datahoraemissao?: string | undefined;
	datahoraentradasaida?: string | undefined;
	tipodocumento?: string | undefined;
	cnpjemissor?: string | undefined;
	razaosocial?: string | undefined;
	inscricaoestadual?: string | undefined;
	cfop?: string | undefined;
	totalproduto?: string | undefined;
	valortotalnota?: string | undefined;
	frete?: string | undefined;
	seguro?: string | undefined;
	outrasdespesas?: string | undefined;
	descontoproduto?: string | undefined;
	baseicms?: string | undefined;
	icms?: string | undefined;
	ipi?: string | undefined;
	pis?: string | undefined;
	cofins?: string | undefined;
	pesobruto?: string | undefined;
	pesoliquido?: string | undefined;
	observacao?: string | undefined;
	protocolonfe?: string | undefined;
	duplicatas?: DuplicataNFeXml[] | undefined;
	itens: ItemNFeXml[];
};

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	removeNSPrefix: true,
	isArray: (name) => name === "det" || name === "dup" || name === "rastro",
	parseTagValue: false,
	trimValues: true,
});

function paraStr(valor: unknown): string | undefined {
	if (valor === undefined || valor === null) return undefined;
	const texto = String(valor).trim();
	return texto === "" ? undefined : texto;
}

type CampoTributoItem = "baseicms" | "icms" | "pis" | "cofins" | "ipi";

function somarTributosItens(
	itens: ItemNFeXml[],
	campo: CampoTributoItem,
): string | undefined {
	let total = 0;
	let encontrouValor = false;

	for (const item of itens) {
		const bruto = item[campo];
		if (bruto === undefined) continue;

		const valor = Number(String(bruto).replace(",", "."));
		if (Number.isNaN(valor)) continue;

		total += valor;
		encontrouValor = true;
	}

	if (!encontrouValor) {
		return undefined;
	}

	return total.toFixed(2);
}

function valorIcmsTot(
	icmsTot: Record<string, unknown> | undefined,
	campo: string,
): string | undefined {
	return paraStr(icmsTot?.[campo]);
}

function valorIcmsTotOuSomaItens(
	icmsTot: Record<string, unknown> | undefined,
	campoTot: string,
	itens: ItemNFeXml[],
	campoItem: CampoTributoItem,
): string | undefined {
	return valorIcmsTot(icmsTot, campoTot) ?? somarTributosItens(itens, campoItem);
}

function toNumber(valor: unknown): number | undefined {
	if (valor === undefined || valor === null) return undefined;
	const n = Number(valor);
	return Number.isNaN(n) ? undefined : n;
}

function extrairRastrosItem(prod: Record<string, unknown>): RastroNFeXml[] {
	const rastroRaw = prod.rastro;
	const lista = Array.isArray(rastroRaw)
		? rastroRaw
		: rastroRaw
			? [rastroRaw]
			: [];

	const rastros: RastroNFeXml[] = [];

	for (const item of lista) {
		const registro = item as Record<string, unknown>;
		const numeroLote = paraStr(registro.nLote);
		const quantidadeLote = paraStr(registro.qLote);
		const dataFabricacao = paraStr(registro.dFab);
		const dataValidade = paraStr(registro.dVal);
		const codigoAgregacao = paraStr(registro.cAgreg);

		if (!numeroLote && !dataValidade && !dataFabricacao) continue;

		rastros.push({
			numeroLote,
			quantidadeLote,
			dataFabricacao,
			dataValidade,
			codigoAgregacao,
		});
	}

	return rastros;
}

function extrairIcmsItem(imposto: Record<string, unknown>): {
	situacaotributaria?: string | undefined;
	baseicms?: string | undefined;
	percentualicms?: string | undefined;
	icms?: string | undefined;
	origem?: number | undefined;
	baseicmsst?: string | undefined;
	icmsst?: string | undefined;
	mvaicmsst?: string | undefined;
	fcpst?: string | undefined;
} {
	const icmsContainer = imposto?.ICMS as Record<string, unknown> | undefined;
	if (!icmsContainer) return {};

	const grupos = [
		"ICMS00", "ICMS10", "ICMS20", "ICMS30", "ICMS40",
		"ICMS41", "ICMS50", "ICMS51", "ICMS60", "ICMS70", "ICMS90",
		"ICMSSN101", "ICMSSN102", "ICMSSN201", "ICMSSN202",
		"ICMSSN500", "ICMSSN900",
	];

	for (const grupo of grupos) {
		const dados = icmsContainer[grupo] as Record<string, unknown> | undefined;
		if (dados) {
			return {
				situacaotributaria: paraStr(dados.CST ?? dados.CSOSN),
				baseicms: paraStr(dados.vBC),
				percentualicms: paraStr(dados.pICMS),
				icms: paraStr(dados.vICMS),
				origem: toNumber(dados.orig),
				baseicmsst: paraStr(dados.vBCST),
				icmsst: paraStr(dados.vICMSST),
				mvaicmsst: paraStr(dados.pMVAST ?? dados.pRedBCST),
				fcpst: paraStr(dados.vFCPST),
			};
		}
	}

	return {};
}

function extrairPisItem(imposto: Record<string, unknown>): {
	cstpis?: string | undefined;
	aliquotapis?: string | undefined;
	pis?: string | undefined;
} {
	const pisContainer = imposto?.PIS as Record<string, unknown> | undefined;
	if (!pisContainer) return {};

	const grupos = ["PISAliq", "PISQtde", "PISNT", "PISOutr"];
	for (const grupo of grupos) {
		const dados = pisContainer[grupo] as Record<string, unknown> | undefined;
		if (dados) {
			return {
				cstpis: paraStr(dados.CST),
				aliquotapis: paraStr(dados.pPIS),
				pis: paraStr(dados.vPIS),
			};
		}
	}
	return {};
}

function extrairCofinsItem(imposto: Record<string, unknown>): {
	cstcofins?: string | undefined;
	aliquotacofins?: string | undefined;
	cofins?: string | undefined;
} {
	const cofinsContainer = imposto?.COFINS as
		| Record<string, unknown>
		| undefined;
	if (!cofinsContainer) return {};

	const grupos = ["COFINSAliq", "COFINSQtde", "COFINSNT", "COFINSOutr"];
	for (const grupo of grupos) {
		const dados = cofinsContainer[grupo] as
			| Record<string, unknown>
			| undefined;
		if (dados) {
			return {
				cstcofins: paraStr(dados.CST),
				aliquotacofins: paraStr(dados.pCOFINS),
				cofins: paraStr(dados.vCOFINS),
			};
		}
	}
	return {};
}

function extrairIpiItem(imposto: Record<string, unknown>): {
	ipi?: string | undefined;
	cstipi?: string | undefined;
	enquadramentoipi?: string | undefined;
} {
	const ipiContainer = imposto?.IPI as Record<string, unknown> | undefined;
	if (!ipiContainer) return {};

	const grupos = ["IPITrib", "IPINT"];
	for (const grupo of grupos) {
		const dados = ipiContainer[grupo] as Record<string, unknown> | undefined;
		if (dados) {
			return {
				ipi: paraStr(dados.vIPI),
				cstipi: paraStr(dados.CST),
				enquadramentoipi: paraStr(ipiContainer.cEnq ?? dados.cEnq),
			};
		}
	}

	const vIPI = paraStr((ipiContainer as Record<string, unknown>).vIPI);
	return vIPI
		? {
				ipi: vIPI,
				enquadramentoipi: paraStr(ipiContainer.cEnq),
			}
		: {
				enquadramentoipi: paraStr(ipiContainer.cEnq),
			};
}

function formatarDataHora(dhEmi: unknown): {
	dataISO?: string;
	dataHoraISO?: string;
} {
	if (!dhEmi) return {};
	const s = String(dhEmi).trim();
	const dataISO = s.substring(0, 10);

	if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
		return {};
	}

	if (s.includes("T")) {
		const dataHoraISO = s.replace(/([+-]\d{2}:\d{2}|Z)$/i, "").substring(0, 19);
		const resultado: { dataISO: string; dataHoraISO?: string } = { dataISO };

		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dataHoraISO)) {
			resultado.dataHoraISO = dataHoraISO;
		}

		return resultado;
	}

	return { dataISO };
}

export function parseNFeXml(xmlString: string): NFeXmlParsed {
	const parsed = xmlParser.parse(xmlString) as Record<string, unknown>;

	const raiz =
		(parsed.nfeProc as Record<string, unknown>) ??
		(parsed.NFe as Record<string, unknown>) ??
		parsed;

	const nfe = (raiz.NFe as Record<string, unknown>) ?? raiz;
	const infNFe = nfe.infNFe as Record<string, unknown>;

	if (!infNFe) {
		throw new Error("XML inválido: elemento <infNFe> não encontrado.");
	}

	const ide = infNFe.ide as Record<string, unknown>;
	const emit = infNFe.emit as Record<string, unknown>;
	const total = infNFe.total as Record<string, unknown>;
	const icmsTot = total?.ICMSTot as Record<string, unknown> | undefined;
	const transp = infNFe.transp as Record<string, unknown> | undefined;
	const vol = transp?.vol as Record<string, unknown> | undefined;
	const infAdic = infNFe.infAdic as Record<string, unknown> | undefined;

	const protNFe = (raiz.protNFe as Record<string, unknown>) ?? undefined;
	const infProt = protNFe?.infProt as Record<string, unknown> | undefined;

	const { dataISO: emissaoISO, dataHoraISO: dhEmissao } = formatarDataHora(
		ide?.dhEmi,
	);
	const { dataISO: entradaISO, dataHoraISO: dhEntrada } = formatarDataHora(
		ide?.dhSaiEnt,
	);

	const detArray = (infNFe.det ?? []) as Array<Record<string, unknown>>;
	const detNormalizado = Array.isArray(detArray) ? detArray : [detArray];

	const itens: ItemNFeXml[] = detNormalizado.map((det) => {
		const prod = det.prod as Record<string, unknown>;
		const imposto = (det.imposto as Record<string, unknown>) ?? {};

		const icmsItem = extrairIcmsItem(imposto);
		const pisItem = extrairPisItem(imposto);
		const cofinsItem = extrairCofinsItem(imposto);
		const ipiItem = extrairIpiItem(imposto);

		const eanBruto = paraStr(prod.cEAN);
		const ean =
			eanBruto && eanBruto !== "SEM GTIN"
				? normalizarCodigoBarras(eanBruto) ?? undefined
				: undefined;

		const codigoStr = paraStr(prod.cProd);
		const codigoNum = codigoStr ? toNumber(codigoStr) : undefined;
		const rastros = extrairRastrosItem(prod);

		return {
			codigoproduto: inteiroValidoParaPostgres(codigoNum),
			ean,
			descricaoproduto: paraStr(prod.xProd) ?? "Produto",
			ncm: paraStr(prod.NCM),
			cest: paraStr(prod.CEST),
			cfop: paraStr(prod.CFOP),
			unidade: paraStr(prod.uCom),
			unidadeTributavel: paraStr(prod.uTrib),
			quantidade: paraStr(prod.qCom),
			quantidadeTributavel: paraStr(prod.qTrib),
			precounitario: paraStr(prod.vUnCom),
			precounitarioTributavel: paraStr(prod.vUnTrib),
			total: paraStr(prod.vProd),
			desconto: paraStr(prod.vDesc),
			referenciafornecedor: codigoStr,
			informacaoadicional: paraStr(det.infAdProd),
			rastros: rastros.length > 0 ? rastros : undefined,
			...icmsItem,
			...pisItem,
			...cofinsItem,
			...ipiItem,
		};
	});

	const dupArray = (infNFe.cobr as Record<string, unknown> | undefined)?.dup;
	const dupNormalizado = Array.isArray(dupArray)
		? dupArray
		: dupArray
			? [dupArray]
			: [];
	const duplicatas: DuplicataNFeXml[] = [];

	for (const dup of dupNormalizado) {
		const registro = dup as Record<string, unknown>;
		const vencimento = paraStr(registro.dVenc);
		const valor = paraStr(registro.vDup);
		const numero = paraStr(registro.nDup);
		if (!vencimento && !valor) continue;
		duplicatas.push({ numero, vencimento, valor });
	}

	const idAttr = (nfe.infNFe as Record<string, unknown>)?.["@_Id"];
	const chaveDoAttr =
		typeof idAttr === "string" ? idAttr.replace(/^NFe/, "") : undefined;

	return {
		chavenfe: paraStr(infProt?.chNFe ?? chaveDoAttr),
		protocolonfe: paraStr(infProt?.nProt),
		numero: paraStr(ide?.nNF),
		numeronotafiscal: paraStr(ide?.nNF),
		serie: paraStr(ide?.serie),
		modelo: paraStr(ide?.mod),
		emissao: emissaoISO,
		datahoraemissao: dhEmissao,
		entradasaida: entradaISO,
		datahoraentradasaida: dhEntrada,
		tipodocumento: paraStr(ide?.mod),
		cnpjemissor: paraStr(emit?.CNPJ ?? emit?.CPF),
		razaosocial: paraStr(emit?.xNome),
		inscricaoestadual: paraStr(emit?.IE),
		cfop: paraStr(
			detNormalizado[0]?.prod
				? (detNormalizado[0].prod as Record<string, unknown>).CFOP
				: undefined,
		),
		totalproduto: paraStr(icmsTot?.vProd),
		frete: paraStr(icmsTot?.vFrete),
		seguro: paraStr(icmsTot?.vSeg),
		outrasdespesas: paraStr(icmsTot?.vOutro),
		descontoproduto: paraStr(icmsTot?.vDesc),
		baseicms: valorIcmsTotOuSomaItens(icmsTot, "vBC", itens, "baseicms"),
		icms: valorIcmsTotOuSomaItens(icmsTot, "vICMS", itens, "icms"),
		ipi: valorIcmsTotOuSomaItens(icmsTot, "vIPI", itens, "ipi"),
		pis: valorIcmsTotOuSomaItens(icmsTot, "vPIS", itens, "pis"),
		cofins: valorIcmsTotOuSomaItens(icmsTot, "vCOFINS", itens, "cofins"),
		valortotalnota: paraStr(icmsTot?.vNF),
		pesobruto: paraStr(vol?.pesoB),
		pesoliquido: paraStr(vol?.pesoL),
		observacao: paraStr(infAdic?.infCpl),
		duplicatas: duplicatas.length > 0 ? duplicatas : undefined,
		itens,
	};
}
