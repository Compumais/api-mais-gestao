import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { buscarVendaPdvGourmet } from "../api/client";
import { getConfig } from "../db/database";
import {
	atualizarVendaSync,
	buscarProdutoPorId,
	enfileirarOutbox,
	type ItemCarrinho,
	obterNumeracaoNfce,
	obterVenda,
	reservarNumeroNfce,
	salvarNfceLocal,
} from "../db/repos";
import { lerEmitenteDanfceCache } from "../impressora/danfce";
import { imprimirDanfce } from "../impressora/escpos";
import { codigoIbgeDaUf, urlConsultaNfce, urlQrCodeNfce } from "./nfce-portais";

function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function pad(num: number | string, size: number): string {
	return String(num).padStart(size, "0");
}

function formatMoney(n: number): string {
	return n.toFixed(2);
}

/** Calcula DV módulo 11 da chave NFC-e (44 dígitos sem DV = 43). */
function calcularDvChave(chave43: string): string {
	let peso = 2;
	let soma = 0;
	for (let i = chave43.length - 1; i >= 0; i--) {
		soma += Number(chave43[i]) * peso;
		peso = peso === 9 ? 2 : peso + 1;
	}
	const resto = soma % 11;
	const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
	return String(dv);
}

function montarChaveAcesso(params: {
	uf: string;
	aamm: string;
	cnpj: string;
	mod: string;
	serie: number;
	numero: number;
	tpEmis: number;
	codigo: string;
}): string {
	const ufCode = codigoIbgeDaUf(params.uf);
	if (ufCode == null) {
		throw new Error(`UF inválida para chave NFC-e: ${params.uf}`);
	}
	const base =
		pad(ufCode, 2) +
		params.aamm +
		pad(onlyDigits(params.cnpj), 14) +
		params.mod +
		pad(params.serie, 3) +
		pad(params.numero, 9) +
		String(params.tpEmis) +
		pad(params.codigo, 8);
	return base + calcularDvChave(base);
}

function montarQrCodeContingencia(params: {
	chave: string;
	ambiente: number;
	cscId: string;
	cscToken: string;
	valor: number;
	uf: string;
}): string {
	const urlBase = urlQrCodeNfce(params.uf, params.ambiente !== 1);
	if (!urlBase) {
		throw new Error(
			`Portal de QR Code NFC-e não configurado para a UF ${params.uf}`,
		);
	}
	const digVal = createHash("sha1")
		.update(`${params.chave}|${params.cscId}|${params.cscToken}`)
		.digest("hex")
		.toUpperCase();
	return `${urlBase}?p=${params.chave}|2|${params.ambiente}|${formatMoney(params.valor)}|${params.cscId}|${digVal}`;
}

type EmitenteFiscalLocal = {
	nome?: string;
	cnpj?: string;
	ie?: string;
	logradouro?: string;
	numero?: string;
	complemento?: string;
	bairro?: string;
	municipio?: string;
	codigoMunicipio?: string;
	cep?: string;
	uf?: string;
	fone?: string;
	crt?: number;
	timezone?: string;
};

type ItemFiscalXml = ItemCarrinho & {
	codigo: string;
	unidade: string;
	ean?: string;
	ncm: string;
	cest?: string;
	cfop: string;
	origem: number;
	cst?: string;
	csosn?: string;
	aliquotaIcms?: number;
	pisCst: string;
	aliquotaPis?: number;
	cofinsCst: string;
	aliquotaCofins?: number;
};

function grupoIcmsXml(
	item: ItemFiscalXml,
	crt: number,
): {
	xml: string;
	base: number;
	valor: number;
} {
	const origem = String(item.origem);
	if (crt === 1) {
		const csosn = item.csosn;
		if (!csosn || !["102", "103", "300", "400"].includes(csosn)) {
			throw new Error(
				`Produto ${item.descricao}: CSOSN ${csosn || "ausente"} não pode ser calculado com os dados fiscais locais`,
			);
		}
		return {
			xml: `<ICMSSN${csosn}><orig>${origem}</orig><CSOSN>${csosn}</CSOSN></ICMSSN${csosn}>`,
			base: 0,
			valor: 0,
		};
	}
	const cst = item.cst;
	if (cst === "00") {
		if (item.aliquotaIcms == null) {
			throw new Error(
				`Produto ${item.descricao}: alíquota ICMS obrigatória para CST 00`,
			);
		}
		const base = item.precototal;
		const valor = Math.round(base * item.aliquotaIcms) / 100;
		return {
			xml: `<ICMS00><orig>${origem}</orig><CST>00</CST><modBC>3</modBC><vBC>${formatMoney(base)}</vBC><pICMS>${item.aliquotaIcms.toFixed(4)}</pICMS><vICMS>${formatMoney(valor)}</vICMS></ICMS00>`,
			base,
			valor,
		};
	}
	if (cst && ["40", "41", "50"].includes(cst)) {
		return {
			xml: `<ICMS40><orig>${origem}</orig><CST>${cst}</CST></ICMS40>`,
			base: 0,
			valor: 0,
		};
	}
	throw new Error(
		`Produto ${item.descricao}: CST ${cst || "ausente"} exige dados tributários não sincronizados`,
	);
}

function grupoContribuicaoXml(
	tipo: "PIS" | "COFINS",
	cst: string,
	total: number,
	aliquota?: number,
): { xml: string; valor: number } {
	if (["04", "05", "06", "07", "08", "09"].includes(cst)) {
		return { xml: `<${tipo}NT><CST>${cst}</CST></${tipo}NT>`, valor: 0 };
	}
	if (["01", "02"].includes(cst) && aliquota != null) {
		const valor = Math.round(total * aliquota) / 100;
		return {
			xml: `<${tipo}Aliq><CST>${cst}</CST><vBC>${formatMoney(total)}</vBC><p${tipo}>${aliquota.toFixed(4)}</p${tipo}><v${tipo}>${formatMoney(valor)}</v${tipo}></${tipo}Aliq>`,
			valor,
		};
	}
	throw new Error(
		`${tipo} CST ${cst || "ausente"} exige alíquota ou base não sincronizada`,
	);
}

export function xmlContingenciaEhLegado(xml: string): boolean {
	return !(
		/<enderEmit[\s>]/.test(xml) &&
		/<NCM>/.test(xml) &&
		/<CFOP>/.test(xml) &&
		/<imposto>/.test(xml) &&
		/<PIS>/.test(xml) &&
		/<COFINS>/.test(xml)
	);
}

function montarXmlContingencia(params: {
	chave: string;
	codigo: string;
	serie: number;
	numero: number;
	uf: string;
	ambiente: number;
	motivo: string;
	dhCont: string;
	dhEmi: string;
	emitente: EmitenteFiscalLocal;
	itens: ItemFiscalXml[];
	total: number;
	desconto: number;
	outros: number;
	pagamentos: Array<{ tPag: string; valor: number }>;
	troco: number;
	qrcode: string;
	urlChave?: string;
}): string {
	let totalBaseIcms = 0;
	let totalIcms = 0;
	let totalPis = 0;
	let totalCofins = 0;
	const itensXml = params.itens
		.map((item, idx) => {
			const icms = grupoIcmsXml(item, params.emitente.crt ?? 0);
			totalBaseIcms += icms.base;
			totalIcms += icms.valor;
			const pis = grupoContribuicaoXml(
				"PIS",
				item.pisCst,
				item.precototal,
				item.aliquotaPis,
			);
			const cofins = grupoContribuicaoXml(
				"COFINS",
				item.cofinsCst,
				item.precototal,
				item.aliquotaCofins,
			);
			totalPis += pis.valor;
			totalCofins += cofins.valor;
			return `
    <det nItem="${idx + 1}">
      <prod>
        <cProd>${escapeXml(item.codigo)}</cProd>
        <cEAN>${item.ean && onlyDigits(item.ean).length === 13 ? onlyDigits(item.ean) : "SEM GTIN"}</cEAN>
        <xProd>${escapeXml(item.descricao)}</xProd>
        <NCM>${item.ncm}</NCM>
        ${item.cest ? `<CEST>${item.cest}</CEST>` : ""}
        <CFOP>${item.cfop}</CFOP>
        <uCom>${escapeXml(item.unidade)}</uCom>
        <qCom>${item.quantidade.toFixed(4)}</qCom>
        <vUnCom>${item.precounitario.toFixed(10)}</vUnCom>
        <vProd>${formatMoney(item.precototal)}</vProd>
        <cEANTrib>${item.ean && onlyDigits(item.ean).length === 13 ? onlyDigits(item.ean) : "SEM GTIN"}</cEANTrib>
        <uTrib>${escapeXml(item.unidade)}</uTrib>
        <qTrib>${item.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${item.precounitario.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto><ICMS>${icms.xml}</ICMS><PIS>${pis.xml}</PIS><COFINS>${cofins.xml}</COFINS></imposto>
    </det>`;
		})
		.join("");

	const pagamentosXml = params.pagamentos
		.map(
			(p) =>
				`<detPag><indPag>0</indPag><tPag>${p.tPag}</tPag><vPag>${formatMoney(p.valor)}</vPag></detPag>`,
		)
		.join("");
	const emit = params.emitente;
	return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${params.chave}" versao="4.00">
    <ide>
      <cUF>${codigoIbgeDaUf(params.uf)}</cUF>
      <cNF>${params.codigo}</cNF>
      <natOp>VENDA</natOp>
      <mod>65</mod>
      <serie>${params.serie}</serie>
      <nNF>${params.numero}</nNF>
      <dhEmi>${params.dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${onlyDigits(params.emitente.codigoMunicipio ?? "")}</cMunFG>
      <tpEmis>9</tpEmis>
      <cDV>${params.chave.slice(-1)}</cDV>
      <tpAmb>${params.ambiente}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>PDV Mais Gestao 0.1</verProc>
      <dhCont>${params.dhCont}</dhCont>
      <xJust>${escapeXml(params.motivo)}</xJust>
    </ide>
    <emit>
      <CNPJ>${onlyDigits(emit.cnpj ?? "")}</CNPJ>
      <xNome>${escapeXml(emit.nome ?? "")}</xNome>
      <enderEmit>
        <xLgr>${escapeXml(emit.logradouro ?? "")}</xLgr><nro>${escapeXml(emit.numero ?? "")}</nro>
        ${emit.complemento ? `<xCpl>${escapeXml(emit.complemento)}</xCpl>` : ""}
        <xBairro>${escapeXml(emit.bairro ?? "")}</xBairro><cMun>${onlyDigits(emit.codigoMunicipio ?? "")}</cMun>
        <xMun>${escapeXml(emit.municipio ?? "")}</xMun><UF>${params.uf}</UF>
        ${emit.cep ? `<CEP>${onlyDigits(emit.cep)}</CEP>` : ""}
        <cPais>1058</cPais><xPais>BRASIL</xPais>
        ${emit.fone ? `<fone>${onlyDigits(emit.fone)}</fone>` : ""}
      </enderEmit>
      <IE>${onlyDigits(emit.ie ?? "")}</IE><CRT>${emit.crt}</CRT>
    </emit>
    ${itensXml}
    <total>
      <ICMSTot>
        <vBC>${formatMoney(totalBaseIcms)}</vBC><vICMS>${formatMoney(totalIcms)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson><vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>0.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet>
        <vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${formatMoney(params.itens.reduce((soma, item) => soma + item.precototal, 0))}</vProd>
        <vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>${formatMoney(params.desconto)}</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>${formatMoney(totalPis)}</vPIS><vCOFINS>${formatMoney(totalCofins)}</vCOFINS><vOutro>${formatMoney(params.outros)}</vOutro>
        <vNF>${formatMoney(params.total)}</vNF>
      </ICMSTot>
    </total>
    <transp><modFrete>9</modFrete></transp>
    <pag>${pagamentosXml}${params.troco > 0 ? `<vTroco>${formatMoney(params.troco)}</vTroco>` : ""}</pag>
  </infNFe>
  <infNFeSupl>
    <qrCode>${escapeXml(params.qrcode)}</qrCode>
    ${params.urlChave ? `<urlChave>${escapeXml(params.urlChave)}</urlChave>` : ""}
  </infNFeSupl>
</NFe>`;
}

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function formatarDataNfe(
	data: Date,
	timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
	let partes: Intl.DateTimeFormatPart[];
	try {
		partes = new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23",
		}).formatToParts(data);
	} catch {
		throw new Error(`Timezone fiscal inválido: ${timeZone}`);
	}
	const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
		partes.find((parte) => parte.type === tipo)?.value ?? "";
	const ano = valor("year");
	const mes = valor("month");
	const dia = valor("day");
	const hora = valor("hour");
	const minuto = valor("minute");
	const segundo = valor("second");
	const comoUtc = Date.UTC(
		Number(ano),
		Number(mes) - 1,
		Number(dia),
		Number(hora),
		Number(minuto),
		Number(segundo),
	);
	const offsetMinutos = Math.round((comoUtc - data.getTime()) / 60_000);
	const sinal = offsetMinutos >= 0 ? "+" : "-";
	const absoluto = Math.abs(offsetMinutos);
	return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${sinal}${pad(Math.floor(absoluto / 60), 2)}:${pad(absoluto % 60, 2)}`;
}

function numeroFiscal(valor: string | null | undefined): number | undefined {
	if (valor == null || valor.trim() === "") return undefined;
	const numero = Number(valor.replace(",", "."));
	return Number.isFinite(numero) ? numero : undefined;
}

function validarEmitenteFiscal(emitente: EmitenteFiscalLocal): void {
	const faltantes = [
		["razão social", emitente.nome],
		["CNPJ", onlyDigits(emitente.cnpj ?? "").length === 14],
		["inscrição estadual", emitente.ie],
		["logradouro", emitente.logradouro],
		["número", emitente.numero],
		["bairro", emitente.bairro],
		["município", emitente.municipio],
		[
			"código IBGE do município",
			onlyDigits(emitente.codigoMunicipio ?? "").length === 7,
		],
		["UF", emitente.uf],
		["CRT", emitente.crt === 1 || emitente.crt === 2 || emitente.crt === 3],
	] as const;
	const ausentes = faltantes
		.filter(([, valor]) => !valor)
		.map(([campo]) => campo);
	if (ausentes.length) {
		throw new Error(
			`Contingência bloqueada: dados fiscais do emitente ausentes/inválidos: ${ausentes.join(", ")}. Sincronize o cadastro fiscal.`,
		);
	}
}

async function carregarItensFiscais(
	itens: ItemCarrinho[],
	crt: number,
): Promise<ItemFiscalXml[]> {
	const resultado: ItemFiscalXml[] = [];
	for (const item of itens) {
		const produto = await buscarProdutoPorId(item.idproduto);
		if (!produto) {
			throw new Error(
				`Contingência bloqueada: cadastro fiscal do produto ${item.descricao} não encontrado`,
			);
		}
		const ncm = onlyDigits(produto.ncm ?? "");
		const cfop = onlyDigits(produto.cfop ?? "");
		const pisCst = onlyDigits(produto.pis_cst ?? "");
		const cofinsCst = onlyDigits(produto.cofins_cst ?? "");
		const erros: string[] = [];
		if (ncm.length !== 8) erros.push("NCM");
		if (cfop.length !== 4) erros.push("CFOP");
		if (!produto.unidademedida?.trim()) erros.push("unidade comercial");
		if (produto.origem == null || produto.origem < 0 || produto.origem > 8)
			erros.push("origem ICMS");
		if (pisCst.length !== 2) erros.push("CST PIS");
		if (cofinsCst.length !== 2) erros.push("CST COFINS");
		if (crt === 1 && onlyDigits(produto.csosn ?? "").length !== 3)
			erros.push("CSOSN");
		if (crt !== 1 && onlyDigits(produto.cst ?? "").length !== 2)
			erros.push("CST ICMS");
		if (erros.length) {
			throw new Error(
				`Contingência bloqueada: produto ${item.descricao} sem ${erros.join(", ")}`,
			);
		}
		resultado.push({
			...item,
			codigo: produto.codigo != null ? String(produto.codigo) : produto.id,
			unidade: produto.unidademedida?.trim() ?? "",
			ean: produto.ean ?? undefined,
			ncm,
			cest: onlyDigits(produto.cest ?? "") || undefined,
			cfop,
			origem: produto.origem ?? 0,
			cst: onlyDigits(produto.cst ?? "") || undefined,
			csosn: onlyDigits(produto.csosn ?? "") || undefined,
			aliquotaIcms: numeroFiscal(produto.aliquotaicms),
			pisCst,
			aliquotaPis: numeroFiscal(produto.aliquotapis),
			cofinsCst,
			aliquotaCofins: numeroFiscal(produto.aliquotacofins),
		});
	}
	return resultado;
}

function tPagNfce(meio: string, formaNfe?: string | null): string {
	const fiscal = onlyDigits(formaNfe ?? "");
	if (fiscal.length === 2) return fiscal;
	if (meio === "DINHEIRO") return "01";
	if (meio === "PIX") return "17";
	if (meio === "CARTAO") return "03";
	throw new Error(`Meio de pagamento ${meio} sem código tPag sincronizado`);
}

export type ResultadoEmissaoLocal = {
	modo: "online" | "contingencia" | "nao_fiscal" | "erro";
	idnfce?: string;
	chave?: string;
	qrcode?: string;
	xml?: string;
	cStat?: string;
	mensagem: string;
};

export async function emitirOuContingencia(params: {
	idvenda: string;
	onlineEmitir: () => Promise<{
		ok: boolean;
		chave?: string;
		qrCode?: string;
		protocolo?: string;
		idnotafiscal?: string;
		cStat?: string;
		erro?: string;
		indisponivel?: boolean;
		naoFiscal?: boolean;
		xml?: string;
		serie?: string;
		numero?: number;
	}>;
}): Promise<ResultadoEmissaoLocal> {
	const emitirNfce = (await getConfig("emitir_nfce", "1")) === "1";
	if (!emitirNfce) {
		await atualizarVendaSync(params.idvenda, { nfce_status: "nao_fiscal" });
		return {
			modo: "nao_fiscal",
			mensagem: "Venda registrada (cupom não fiscal)",
		};
	}

	const online = await params.onlineEmitir();
	if (online.naoFiscal) {
		await atualizarVendaSync(params.idvenda, { nfce_status: "nao_fiscal" });
		return {
			modo: "nao_fiscal",
			mensagem: "NFC-e não emitida para este meio de pagamento",
		};
	}
	if (online.ok) {
		const { persistirNfceOnlineLocal } = await import(
			"./persistir-nfce-online"
		);
		await persistirNfceOnlineLocal({
			idvenda: params.idvenda,
			idnotafiscal: online.idnotafiscal,
			chave: online.chave,
			qrCode: online.qrCode,
			protocolo: online.protocolo,
			xml: online.xml,
			serie: online.serie,
			numero: online.numero,
		});
		await imprimirDanfce({
			chave: online.chave,
			qrcode: online.qrCode,
			contingencia: false,
			vendaId: params.idvenda,
		});
		return {
			modo: "online",
			idnfce: online.idnotafiscal,
			chave: online.chave,
			qrcode: online.qrCode,
			mensagem: "NFC-e autorizada",
		};
	}

	// Rejeição SEFAZ / erro de negócio: não cai em contingência — devolve o motivo.
	if (!online.indisponivel && online.erro) {
		await atualizarVendaSync(params.idvenda, { nfce_status: "erro" });
		const mensagem = online.cStat
			? `NFC-e rejeitada (${online.cStat}): ${online.erro}`
			: `NFC-e rejeitada: ${online.erro}`;
		return {
			modo: "erro",
			cStat: online.cStat,
			mensagem,
		};
	}

	const { avaliarEmissaoNfceDaVenda } = await import(
		"./avaliar-emissao-nfce-venda"
	);
	if (!(await avaliarEmissaoNfceDaVenda(params.idvenda)).deveEmitir) {
		await atualizarVendaSync(params.idvenda, { nfce_status: "nao_fiscal" });
		return {
			modo: "nao_fiscal",
			mensagem: "NFC-e não emitida para este meio de pagamento",
		};
	}

	return emitirContingencia(
		params.idvenda,
		online.erro ?? "Sem comunicação com backend/SEFAZ",
	);
}

export async function emitirContingencia(
	idvenda: string,
	motivo: string,
	opcoes?: {
		/** Reemissão por conflito: não bloqueia se a retaguarda já tiver NFC-e (trata à parte). */
		forcarNovaNumeracao?: boolean;
		/** Não imprime DANFC-e (o chamador imprime). */
		silenciarImpressao?: boolean;
	},
): Promise<ResultadoEmissaoLocal> {
	const venda = await obterVenda(idvenda);
	if (!venda) {
		throw new Error("Venda não encontrada");
	}

	if (
		venda.nfce_status === "autorizada" ||
		venda.nfce_status === "transmitida"
	) {
		return {
			modo: "online",
			mensagem:
				"NFC-e desta venda já foi enviada. Aguarde a autorização ou retransmita pela retaguarda.",
		};
	}

	if (venda.idremoto && !opcoes?.forcarNovaNumeracao) {
		try {
			const remota = await buscarVendaPdvGourmet(venda.idremoto);
			if (remota.idnotafiscalnfce || remota.nfce?.idnotafiscal) {
				await atualizarVendaSync(idvenda, { nfce_status: "pendente" });
				return {
					modo: "erro",
					mensagem:
						"Esta venda já possui NFC-e na retaguarda. Retransmita o cupom em vez de emitir contingência.",
				};
			}
		} catch {
			// se a consulta falhar, segue para contingência local
		}
	}

	const numeracao = await obterNumeracaoNfce();
	if (!numeracao.cnpj || !numeracao.csc_id || !numeracao.csc_token) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "nao_fiscal",
			mensagem:
				"Contingência indisponível: sincronize CSC/CNPJ nas configurações com a API online.",
		};
	}

	const agora = new Date();
	const emitenteCache =
		(await lerEmitenteDanfceCache()) as EmitenteFiscalLocal | null;
	const uf = (numeracao.uf || emitenteCache?.uf || "").trim().toUpperCase();
	if (!uf || codigoIbgeDaUf(uf) == null) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "nao_fiscal",
			mensagem:
				"Contingência indisponível: UF do emitente não configurada. Sincronize os dados fiscais.",
		};
	}
	const emitente: EmitenteFiscalLocal = {
		...emitenteCache,
		cnpj: numeracao.cnpj,
		uf,
	};
	try {
		validarEmitenteFiscal(emitente);
	} catch (err) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "erro",
			mensagem: err instanceof Error ? err.message : "Dados fiscais inválidos",
		};
	}
	let itensFiscais: ItemFiscalXml[];
	try {
		itensFiscais = await carregarItensFiscais(venda.itens, emitente.crt ?? 0);
	} catch (err) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "erro",
			mensagem:
				err instanceof Error ? err.message : "Tributação local incompleta",
		};
	}
	const pagamentosValidos = venda.pagamentos.filter(
		(p) => (p.status ?? "ok") === "ok" && p.valor > 0,
	);
	let pagamentos: Array<{ tPag: string; valor: number }>;
	try {
		pagamentos = pagamentosValidos.length
			? pagamentosValidos.map((p) => ({
					tPag: tPagNfce(p.meio, p.formapagamentonfe),
					valor: p.valor,
				}))
			: [{ tPag: tPagNfce(venda.meio_pagamento), valor: venda.valortotal }];
	} catch (err) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "erro",
			mensagem:
				err instanceof Error
					? `Contingência bloqueada: ${err.message}`
					: "Pagamento fiscal inválido",
		};
	}
	const totalProdutos = itensFiscais.reduce(
		(soma, item) => soma + item.precototal,
		0,
	);
	const outros =
		(venda.valoracrescimo ?? 0) +
		(venda.valortaxaservico ?? 0) +
		(venda.valorcouvert ?? 0) +
		(venda.valorentrega ?? 0);
	const totalCalculado = totalProdutos - (venda.valordesconto ?? 0) + outros;
	if (Math.abs(totalCalculado - venda.valortotal) > 0.01) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "erro",
			mensagem: `Contingência bloqueada: total fiscal (${formatMoney(totalCalculado)}) diverge da venda (${formatMoney(venda.valortotal)})`,
		};
	}

	const { serie, numero } = await reservarNumeroNfce();
	const timezone =
		emitente.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
	const dh = formatarDataNfe(agora, timezone);
	const aamm = `${dh.slice(2, 4)}${dh.slice(5, 7)}`;
	const codigo = pad(Math.floor(Math.random() * 100_000_000), 8);
	const chave = montarChaveAcesso({
		uf,
		aamm,
		cnpj: numeracao.cnpj,
		mod: "65",
		serie,
		numero,
		tpEmis: 9,
		codigo,
	});

	const qrcode = montarQrCodeContingencia({
		chave,
		ambiente: numeracao.ambiente,
		cscId: numeracao.csc_id,
		cscToken: numeracao.csc_token,
		valor: venda.valortotal,
		uf,
	});
	const urlChave = urlConsultaNfce(uf, numeracao.ambiente !== 1);

	const xml = montarXmlContingencia({
		chave,
		codigo,
		serie,
		numero,
		uf,
		ambiente: numeracao.ambiente,
		motivo: motivo.slice(0, 255),
		dhCont: dh,
		dhEmi: dh,
		emitente,
		itens: itensFiscais,
		total: venda.valortotal,
		desconto: venda.valordesconto ?? 0,
		outros,
		pagamentos,
		troco: venda.valortroco ?? 0,
		qrcode,
		...(urlChave ? { urlChave } : {}),
	});
	const xmlSha256 = createHash("sha256").update(xml, "utf8").digest("hex");

	const id = uuidv4();
	await salvarNfceLocal({
		id,
		idvenda,
		serie,
		numero,
		chave,
		tpemis: 9,
		status: "contingencia",
		xml,
		qrcode,
		motivo_contingencia: motivo.slice(0, 255),
		data_contingencia: dh,
		xml_sha256: xmlSha256,
		transmitida: false,
	});

	await enfileirarOutbox("transmitir_nfce_contingencia", {
		idnfce_local: id,
		idvenda,
		xml,
		chave,
		serie,
		numero,
		motivo: motivo.slice(0, 255),
		datacontingencia: dh,
		xmlSha256,
	});

	if (!opcoes?.silenciarImpressao) {
		try {
			await imprimirDanfce({
				chave,
				qrcode,
				contingencia: true,
				motivo,
				vendaId: idvenda,
			});
		} catch {
			/* impressão best-effort — emissão já gravada */
		}
	}

	return {
		modo: "contingencia",
		idnfce: id,
		chave,
		qrcode,
		xml,
		mensagem: "NFC-e emitida em contingência offline (tpEmis=9)",
	};
}
