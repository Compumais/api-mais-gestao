import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { buscarVendaPdvGourmet } from "../api/client";
import { getConfig } from "../db/database";
import {
	atualizarVendaSync,
	enfileirarOutbox,
	type ItemCarrinho,
	type MeioPagamento,
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

function montarXmlContingencia(params: {
	chave: string;
	serie: number;
	numero: number;
	cnpj: string;
	uf: string;
	ambiente: number;
	motivo: string;
	dhCont: string;
	dhEmi: string;
	itens: ItemCarrinho[];
	total: number;
	meio: MeioPagamento;
	qrcode: string;
	urlChave?: string;
}): string {
	const itensXml = params.itens
		.map(
			(item, idx) => `
    <det nItem="${idx + 1}">
      <prod>
        <cProd>${escapeXml(item.idproduto)}</cProd>
        <xProd>${escapeXml(item.descricao)}</xProd>
        <qCom>${item.quantidade.toFixed(4)}</qCom>
        <vUnCom>${formatMoney(item.precounitario)}</vUnCom>
        <vProd>${formatMoney(item.precototal)}</vProd>
      </prod>
    </det>`,
		)
		.join("");

	const tPag =
		params.meio === "DINHEIRO" ? "01" : params.meio === "PIX" ? "17" : "03";

	return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${params.chave}" versao="4.00">
    <ide>
      <cUF>${codigoIbgeDaUf(params.uf)}</cUF>
      <natOp>VENDA</natOp>
      <mod>65</mod>
      <serie>${params.serie}</serie>
      <nNF>${params.numero}</nNF>
      <dhEmi>${params.dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <tpEmis>9</tpEmis>
      <tpAmb>${params.ambiente}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <dhCont>${params.dhCont}</dhCont>
      <xJust>${escapeXml(params.motivo)}</xJust>
    </ide>
    <emit>
      <CNPJ>${onlyDigits(params.cnpj)}</CNPJ>
    </emit>
    ${itensXml}
    <total>
      <ICMSTot>
        <vProd>${formatMoney(params.total)}</vProd>
        <vNF>${formatMoney(params.total)}</vNF>
      </ICMSTot>
    </total>
    <pag>
      <detPag>
        <tPag>${tPag}</tPag>
        <vPag>${formatMoney(params.total)}</vPag>
      </detPag>
    </pag>
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

	return emitirContingencia(
		params.idvenda,
		online.erro ?? "Sem comunicação com backend/SEFAZ",
	);
}

export async function emitirContingencia(
	idvenda: string,
	motivo: string,
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

	if (venda.idremoto) {
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

	const { serie, numero } = await reservarNumeroNfce();
	const agora = new Date();
	const aamm = `${String(agora.getFullYear()).slice(2)}${pad(agora.getMonth() + 1, 2)}`;
	const codigo = pad(Math.floor(Math.random() * 99999999), 8);
	const emitenteCache = await lerEmitenteDanfceCache();
	const uf = (numeracao.uf || emitenteCache?.uf || "").trim().toUpperCase();
	if (!uf || codigoIbgeDaUf(uf) == null) {
		await atualizarVendaSync(idvenda, { nfce_status: "erro_config" });
		return {
			modo: "nao_fiscal",
			mensagem:
				"Contingência indisponível: UF do emitente não configurada. Sincronize os dados fiscais.",
		};
	}
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

	const dh = agora.toISOString().replace(/\.\d{3}Z$/, "-03:00");
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
		serie,
		numero,
		cnpj: numeracao.cnpj,
		uf,
		ambiente: numeracao.ambiente,
		motivo: motivo.slice(0, 255),
		dhCont: dh,
		dhEmi: dh,
		itens: venda.itens,
		total: venda.valortotal,
		meio: venda.meio_pagamento as MeioPagamento,
		qrcode,
		...(urlChave ? { urlChave } : {}),
	});

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
	});

	await imprimirDanfce({
		chave,
		qrcode,
		contingencia: true,
		motivo,
		vendaId: idvenda,
	});

	return {
		modo: "contingencia",
		idnfce: id,
		chave,
		qrcode,
		xml,
		mensagem: "NFC-e emitida em contingência offline (tpEmis=9)",
	};
}
