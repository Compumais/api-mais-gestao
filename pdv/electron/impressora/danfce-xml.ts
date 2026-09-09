export type ItemDanfce = {
	nItem?: number;
	codigo: string;
	descricao: string;
	quantidade: number;
	unidade: string;
	unitario: number;
	total: number;
	desconto?: number;
};

export type PagamentoDanfce = {
	tipo: string;
	valor: number;
};

export type EmitenteDanfce = {
	nome: string;
	fantasia?: string;
	cnpj: string;
	ie?: string;
	logradouro?: string;
	numero?: string;
	complemento?: string;
	bairro?: string;
	municipio?: string;
	uf?: string;
	cep?: string;
	fone?: string;
	crt?: number;
};

export type ConsumidorDanfce = {
	tipo?: "cpf" | "cnpj";
	documento?: string;
	nome?: string;
	endereco?: string;
};

export type DadosDanfce = {
	emitente: EmitenteDanfce;
	homologacao: boolean;
	contingencia: boolean;
	pendenteAutorizacao: boolean;
	itens: ItemDanfce[];
	valorProdutos: number;
	desconto: number;
	frete: number;
	seguro: number;
	outras: number;
	valorPagar: number;
	pagamentos: PagamentoDanfce[];
	troco: number;
	urlChave?: string;
	chave?: string;
	consumidor?: ConsumidorDanfce;
	numero: number;
	serie: number;
	dhEmi?: string;
	protocolo?: string;
	dhAutorizacao?: string;
	qrcode?: string;
	vTotTrib?: number | null;
	infCpl?: string;
	infAdFisco?: string;
};

function tag(xml: string, nome: string): string | null {
	const re = new RegExp(
		`<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</(?:[\\w.]+:)?${nome}>`,
		"i",
	);
	const valor = xml.match(re)?.[1]?.trim();
	return valor || null;
}

function bloco(xml: string, nome: string): string | null {
	const re = new RegExp(
		`<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.]+:)?${nome}>`,
		"i",
	);
	return xml.match(re)?.[1] ?? null;
}

function blocos(xml: string, nome: string): string[] {
	const re = new RegExp(
		`<(?:[\\w.]+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.]+:)?${nome}>`,
		"gi",
	);
	return [...xml.matchAll(re)].map((m) => m[1] ?? "");
}

function numeroXml(valor: string | null | undefined): number {
	if (!valor) return 0;
	const n = Number.parseFloat(valor.replace(",", "."));
	return Number.isFinite(n) ? n : 0;
}

/** Rótulos curtos para caber no cupom de 80 mm. */
const ROTULO_TPAG: Record<string, string> = {
	"01": "Dinheiro",
	"02": "Cheque",
	"03": "Cartao de Credito",
	"04": "Cartao de Debito",
	"05": "Credito Loja",
	"10": "Vale Alimentacao",
	"11": "Vale Refeicao",
	"12": "Vale Presente",
	"13": "Vale Combustivel",
	"15": "Boleto",
	"16": "Deposito Bancario",
	"17": "PIX",
	"18": "Transferencia",
	"19": "Fidelidade",
	"20": "PIX",
	"21": "Credito em Loja",
	"22": "Pagto Eletronico",
	"90": "Sem pagamento",
	"91": "Pagto Posterior",
	"99": "Outros",
};

export function rotuloFormaPagamentoNfce(tPag: string | number): string {
	const codigo = String(tPag).replace(/\D/g, "").padStart(2, "0");
	const rotulo = ROTULO_TPAG[codigo] ?? `Outros (${codigo})`;
	return rotulo.toLocaleUpperCase("pt-BR");
}

function parseItens(xml: string): ItemDanfce[] {
	const re = /<(?:[\w.]+:)?det\b([^>]*)>([\s\S]*?)<\/(?:[\w.]+:)?det>/gi;
	const itens: ItemDanfce[] = [];
	let indice = 0;
	for (const m of xml.matchAll(re)) {
		indice += 1;
		const attrs = m[1] ?? "";
		const det = m[2] ?? "";
		const nItemAttr = attrs.match(/nItem\s*=\s*["']?(\d+)/i)?.[1];
		const prod = bloco(det, "prod") ?? det;
		const desconto = numeroXml(tag(prod, "vDesc"));
		itens.push({
			nItem: nItemAttr ? Number(nItemAttr) : indice,
			codigo: tag(prod, "cProd") ?? "",
			descricao: tag(prod, "xProd") ?? "",
			quantidade: numeroXml(tag(prod, "qCom")),
			unidade: tag(prod, "uCom") ?? "UN",
			unitario: numeroXml(tag(prod, "vUnCom")),
			total: numeroXml(tag(prod, "vProd")),
			...(desconto > 0 ? { desconto } : {}),
		});
	}
	return itens;
}

function parsePagamentos(xml: string): PagamentoDanfce[] {
	const dets = blocos(xml, "detPag");
	if (!dets.length) {
		const pag = bloco(xml, "pag");
		if (!pag) return [];
		const tPag = tag(pag, "tPag");
		const vPag = tag(pag, "vPag");
		if (!tPag) return [];
		return [
			{
				tipo: rotuloFormaPagamentoNfce(tPag),
				valor: numeroXml(vPag),
			},
		];
	}
	return dets.map((det) => ({
		tipo: rotuloFormaPagamentoNfce(tag(det, "tPag") ?? "99"),
		valor: numeroXml(tag(det, "vPag")),
	}));
}

function parseConsumidor(xml: string): ConsumidorDanfce | undefined {
	const dest = bloco(xml, "dest");
	if (!dest) return undefined;
	const cnpj = tag(dest, "CNPJ");
	const cpf = tag(dest, "CPF");
	const nome = tag(dest, "xNome") ?? undefined;
	const ender = bloco(dest, "enderDest");
	const partes = ender
		? [
				[tag(ender, "xLgr"), tag(ender, "nro")].filter(Boolean).join(", "),
				tag(ender, "xCpl"),
				tag(ender, "xBairro"),
				[tag(ender, "xMun"), tag(ender, "UF")].filter(Boolean).join("/"),
				tag(ender, "CEP") ? `CEP ${tag(ender, "CEP")}` : "",
			]
				.map((p) => p?.trim())
				.filter(Boolean)
		: [];
	return {
		...(cnpj
			? { tipo: "cnpj" as const, documento: cnpj }
			: cpf
				? { tipo: "cpf" as const, documento: cpf }
				: {}),
		...(nome ? { nome } : {}),
		...(partes.length ? { endereco: partes.join(" - ") } : {}),
	};
}

function opcional(valor: string | null): string | undefined {
	const t = valor?.trim();
	return t ? t : undefined;
}

function parseEmitente(xml: string): EmitenteDanfce | null {
	const emit = bloco(xml, "emit");
	if (!emit) return null;
	const ender = bloco(emit, "enderEmit") ?? "";
	const nome = tag(emit, "xNome") ?? tag(emit, "xFant");
	const cnpj = tag(emit, "CNPJ");
	if (!nome && !cnpj) return null;
	const crt = numeroXml(tag(emit, "CRT"));
	const fantasia = opcional(tag(emit, "xFant"));
	return {
		nome: nome ?? "",
		cnpj: cnpj ?? "",
		...(fantasia && fantasia !== nome ? { fantasia } : {}),
		...(opcional(tag(emit, "IE")) ? { ie: opcional(tag(emit, "IE")) } : {}),
		...(opcional(tag(ender, "xLgr"))
			? { logradouro: opcional(tag(ender, "xLgr")) }
			: {}),
		...(opcional(tag(ender, "nro"))
			? { numero: opcional(tag(ender, "nro")) }
			: {}),
		...(opcional(tag(ender, "xCpl"))
			? { complemento: opcional(tag(ender, "xCpl")) }
			: {}),
		...(opcional(tag(ender, "xBairro"))
			? { bairro: opcional(tag(ender, "xBairro")) }
			: {}),
		...(opcional(tag(ender, "xMun"))
			? { municipio: opcional(tag(ender, "xMun")) }
			: {}),
		...(opcional(tag(ender, "UF")) ? { uf: opcional(tag(ender, "UF")) } : {}),
		...(opcional(tag(ender, "CEP"))
			? { cep: opcional(tag(ender, "CEP")) }
			: {}),
		...(opcional(tag(ender, "fone"))
			? { fone: opcional(tag(ender, "fone")) }
			: {}),
		...(crt > 0 ? { crt } : {}),
	};
}

function chaveDoXml(xml: string): string | undefined {
	const inf = xml.match(/\bId="NFe(\d{44})"/i)?.[1];
	if (inf) return inf;
	const chNFe = tag(xml, "chNFe");
	return chNFe?.replace(/\D/g, "") || undefined;
}

export function parseXmlDanfce(
	xml: string | null | undefined,
): Partial<DadosDanfce> {
	if (!xml?.trim()) return {};
	const ide = bloco(xml, "ide") ?? xml;
	const icmsTot = bloco(xml, "ICMSTot") ?? "";
	const pag = bloco(xml, "pag") ?? "";
	const infProt = bloco(xml, "infProt");
	const emitente = parseEmitente(xml);
	const itens = parseItens(xml);
	const pagamentos = parsePagamentos(xml);
	const consumidor = parseConsumidor(xml);
	const vNF = numeroXml(tag(icmsTot, "vNF"));
	const vDesc = numeroXml(tag(icmsTot, "vDesc"));
	const vFrete = numeroXml(tag(icmsTot, "vFrete"));
	const vSeg = numeroXml(tag(icmsTot, "vSeg"));
	const vOutro = numeroXml(tag(icmsTot, "vOutro"));
	const vProd = numeroXml(tag(icmsTot, "vProd"));
	const vTotTribRaw = tag(icmsTot, "vTotTrib");
	const qrCode = tag(xml, "qrCode") ?? undefined;
	const urlChave = tag(xml, "urlChave") ?? undefined;
	const tpAmb = tag(ide, "tpAmb");
	const tpEmis = tag(ide, "tpEmis");
	const nNF = numeroXml(tag(ide, "nNF"));
	const serie = numeroXml(tag(ide, "serie"));
	const infCpl = tag(xml, "infCpl") ?? undefined;
	const infAdFisco = tag(xml, "infAdFisco") ?? undefined;

	return {
		...(emitente ? { emitente } : {}),
		...(tpAmb ? { homologacao: tpAmb === "2" } : {}),
		...(tpEmis ? { contingencia: tpEmis === "9" } : {}),
		...(infProt != null || tag(xml, "ide")
			? { pendenteAutorizacao: !infProt }
			: {}),
		...(itens.length ? { itens } : {}),
		...(vProd > 0 || vNF > 0
			? { valorProdutos: vProd > 0 ? vProd : vNF + vDesc - vFrete }
			: {}),
		...(icmsTot
			? {
					desconto: vDesc,
					frete: vFrete,
					seguro: vSeg,
					outras: vOutro,
					vTotTrib: vTotTribRaw != null ? numeroXml(vTotTribRaw) : null,
				}
			: {}),
		...(vNF > 0 ? { valorPagar: vNF } : {}),
		...(pagamentos.length ? { pagamentos } : {}),
		...(pag ? { troco: numeroXml(tag(pag, "vTroco")) } : {}),
		...(urlChave ? { urlChave } : {}),
		...(chaveDoXml(xml) ? { chave: chaveDoXml(xml) } : {}),
		...(consumidor ? { consumidor } : {}),
		...(nNF > 0 ? { numero: nNF } : {}),
		...(serie > 0 ? { serie } : {}),
		...(tag(ide, "dhEmi") ? { dhEmi: tag(ide, "dhEmi") ?? undefined } : {}),
		...(tag(infProt ?? "", "nProt")
			? { protocolo: tag(infProt ?? "", "nProt") ?? undefined }
			: {}),
		...(tag(infProt ?? "", "dhRecbto")
			? { dhAutorizacao: tag(infProt ?? "", "dhRecbto") ?? undefined }
			: {}),
		...(qrCode ? { qrcode: qrCode } : {}),
		...(infCpl ? { infCpl } : {}),
		...(infAdFisco ? { infAdFisco } : {}),
	};
}
