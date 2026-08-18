export type ItemDanfce = {
	codigo: string;
	descricao: string;
	quantidade: number;
	unidade: string;
	unitario: number;
	total: number;
};

export type PagamentoDanfce = {
	tipo: string;
	valor: number;
};

export type EmitenteDanfce = {
	nome: string;
	cnpj: string;
	ie?: string;
	logradouro?: string;
	numero?: string;
	bairro?: string;
	municipio?: string;
	uf?: string;
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

const ROTULO_TPAG: Record<string, string> = {
	"01": "Dinheiro",
	"02": "Cheque",
	"03": "Cartão de Crédito",
	"04": "Cartão de Débito",
	"05": "Cartão da Loja/Outros Crediários",
	"10": "Vale Alimentação",
	"11": "Vale Refeição",
	"12": "Vale Presente",
	"13": "Vale Combustível",
	"15": "Boleto Bancário",
	"16": "Depósito Bancário",
	"17": "Pagamento Instantâneo (PIX) - Dinâmico",
	"18": "Transferência bancária, Carteira Digital",
	"19": "Programa fidelidade, Cashback, Créd Virt",
	"20": "Pagamento Instantâneo (PIX) - Estático",
	"21": "Crédito em Loja",
	"22": "Pagamento Eletrônico não Informado",
	"90": "Sem pagamento",
	"91": "Pagamento Posterior",
	"99": "Outros",
};

export function rotuloFormaPagamentoNfce(tPag: string | number): string {
	const codigo = String(tPag).replace(/\D/g, "").padStart(2, "0");
	const rotulo = ROTULO_TPAG[codigo] ?? `Outros (${codigo})`;
	return rotulo.toLocaleUpperCase("pt-BR");
}

function parseItens(xml: string): ItemDanfce[] {
	return blocos(xml, "det").map((det) => {
		const prod = bloco(det, "prod") ?? det;
		return {
			codigo: tag(prod, "cProd") ?? "",
			descricao: tag(prod, "xProd") ?? "",
			quantidade: numeroXml(tag(prod, "qCom")),
			unidade: tag(prod, "uCom") ?? "UN",
			unitario: numeroXml(tag(prod, "vUnCom")),
			total: numeroXml(tag(prod, "vProd")),
		};
	});
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
				[tag(ender, "xMun"), tag(ender, "UF")].filter(Boolean).join("-"),
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
		...(partes.length ? { endereco: partes.join(" ") } : {}),
	};
}

function parseEmitente(xml: string): EmitenteDanfce | null {
	const emit = bloco(xml, "emit");
	if (!emit) return null;
	const ender = bloco(emit, "enderEmit") ?? "";
	const nome = tag(emit, "xNome") ?? tag(emit, "xFant");
	const cnpj = tag(emit, "CNPJ");
	if (!nome && !cnpj) return null;
	const crt = numeroXml(tag(emit, "CRT"));
	return {
		nome: nome ?? "",
		cnpj: cnpj ?? "",
		...(tag(emit, "IE") ? { ie: tag(emit, "IE") ?? undefined } : {}),
		...(tag(ender, "xLgr")
			? { logradouro: tag(ender, "xLgr") ?? undefined }
			: {}),
		...(tag(ender, "nro") ? { numero: tag(ender, "nro") ?? undefined } : {}),
		...(tag(ender, "xBairro")
			? { bairro: tag(ender, "xBairro") ?? undefined }
			: {}),
		...(tag(ender, "xMun")
			? { municipio: tag(ender, "xMun") ?? undefined }
			: {}),
		...(tag(ender, "UF") ? { uf: tag(ender, "UF") ?? undefined } : {}),
		...(tag(ender, "fone") ? { fone: tag(ender, "fone") ?? undefined } : {}),
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
	const vProd = numeroXml(tag(icmsTot, "vProd"));
	const vTotTribRaw = tag(icmsTot, "vTotTrib");
	const qrCode = tag(xml, "qrCode") ?? undefined;
	const urlChave = tag(xml, "urlChave") ?? undefined;
	const tpAmb = tag(ide, "tpAmb");
	const tpEmis = tag(ide, "tpEmis");
	const nNF = numeroXml(tag(ide, "nNF"));
	const serie = numeroXml(tag(ide, "serie"));
	const infCpl = tag(xml, "infCpl") ?? undefined;

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
	};
}
