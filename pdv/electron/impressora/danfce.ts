import { getConfig } from "../db/database";
import {
	buscarProdutoPorId,
	obterNfcePorVenda,
	obterNumeracaoNfce,
	obterSessao,
	obterVenda,
} from "../db/repos";
import { resolverUfEmitente, urlConsultaNfce } from "../fiscal/nfce-portais";
import { montarHtmlDanfce } from "./danfce-html";
import { juntarDadosDanfce, montarTextoDanfce } from "./danfce-layout";
import {
	type DadosDanfce,
	type EmitenteDanfce,
	type ItemDanfce,
	type PagamentoDanfce,
	parseXmlDanfce,
	rotuloFormaPagamentoNfce,
} from "./danfce-xml";
import { enviarDanfceImpressora } from "./destino";
import { svgQrCode } from "./qr-svg";

export const CHAVE_EMITENTE_DANFCE = "emitente_danfce_json";

export async function lerEmitenteDanfceCache(): Promise<EmitenteDanfce | null> {
	const raw = await getConfig(CHAVE_EMITENTE_DANFCE, "");
	if (!raw.trim()) return null;
	try {
		const parsed = JSON.parse(raw) as EmitenteDanfce;
		if (!parsed || typeof parsed !== "object") return null;
		return parsed;
	} catch {
		return null;
	}
}

function tPagDoMeio(meio: string): string {
	if (meio === "DINHEIRO") return "01";
	if (meio === "PIX") return "17";
	if (meio === "CARTAO") return "03";
	return "99";
}

export async function montarDadosDanfce(params: {
	vendaId: string;
	chave?: string;
	qrcode?: string;
	contingencia?: boolean;
	motivo?: string;
}): Promise<DadosDanfce> {
	const venda = await obterVenda(params.vendaId);
	if (!venda) {
		throw new Error("Venda nao encontrada");
	}

	const nfce = await obterNfcePorVenda(params.vendaId);
	const sessao = await obterSessao();
	const numeracao = await obterNumeracaoNfce().catch(() => null);
	const emitenteCache = await lerEmitenteDanfceCache();
	const xml = parseXmlDanfce(nfce?.xml);

	const itens: ItemDanfce[] = [];
	for (const item of venda.itens) {
		const produto = await buscarProdutoPorId(item.idproduto);
		itens.push({
			codigo: produto?.codigo != null ? String(produto.codigo) : item.idproduto,
			descricao: item.descricao,
			quantidade: item.quantidade,
			unidade: produto?.unidademedida || item.unidademedida || "UN",
			unitario: item.precounitario,
			total: item.precototal,
		});
	}

	const pagamentos: PagamentoDanfce[] = (venda.pagamentos ?? [])
		.filter((p) => (p.status ?? "ok") === "ok" && p.valor > 0)
		.map((p) => ({
			tipo: rotuloFormaPagamentoNfce(tPagDoMeio(p.meio)),
			valor: p.valor,
		}));
	if (!pagamentos.length && venda.meio_pagamento) {
		pagamentos.push({
			tipo: rotuloFormaPagamentoNfce(tPagDoMeio(venda.meio_pagamento)),
			valor: venda.valortotal,
		});
	}

	const homologacao =
		xml.homologacao ??
		(numeracao?.ambiente != null && numeracao.ambiente !== 1);
	const chave = params.chave || nfce?.chave || undefined;
	const qrcode = params.qrcode || nfce?.qrcode || undefined;
	const uf = resolverUfEmitente({
		uf: xml.emitente?.uf || emitenteCache?.uf || numeracao?.uf || undefined,
		chave,
	});

	const fallback: Partial<DadosDanfce> = {
		emitente: {
			nome: emitenteCache?.nome || sessao.nomeempresa || "",
			cnpj: emitenteCache?.cnpj || numeracao?.cnpj || "",
			ie: emitenteCache?.ie,
			logradouro: emitenteCache?.logradouro,
			numero: emitenteCache?.numero,
			bairro: emitenteCache?.bairro,
			municipio: emitenteCache?.municipio,
			uf,
			fone: emitenteCache?.fone,
			crt: emitenteCache?.crt,
		},
		homologacao,
		contingencia: params.contingencia ?? nfce?.tpemis === 9,
		pendenteAutorizacao: !nfce?.protocolo && xml.pendenteAutorizacao !== false,
		itens,
		valorProdutos: venda.valortotal + (venda.valordesconto ?? 0),
		desconto: venda.valordesconto ?? 0,
		frete: 0,
		valorPagar: venda.valortotal,
		pagamentos,
		troco: venda.valortroco ?? 0,
		chave,
		qrcode,
		urlChave: urlConsultaNfce(uf, homologacao),
		consumidor:
			venda.cnpjcpf || venda.nomecliente
				? {
						tipo: onlyDigitsLen(venda.cnpjcpf) > 11 ? "cnpj" : "cpf",
						documento: venda.cnpjcpf ?? undefined,
						nome: venda.nomecliente ?? undefined,
					}
				: undefined,
		numero: nfce?.numero ?? 0,
		serie: nfce?.serie ?? 0,
		dhEmi: venda.criadoem,
		protocolo: nfce?.protocolo ?? undefined,
	};

	if (params.motivo && fallback.contingencia && !xml.infCpl) {
		fallback.infCpl = params.motivo;
	}

	return juntarDadosDanfce(xml, fallback);
}

function onlyDigitsLen(valor?: string | null): number {
	return (valor ?? "").replace(/\D/g, "").length;
}

export async function imprimirDanfce(params: {
	vendaId: string;
	chave?: string;
	qrcode?: string;
	contingencia?: boolean;
	motivo?: string;
}): Promise<{ ok: boolean; modo: string }> {
	const dados = await montarDadosDanfce(params);
	const texto = montarTextoDanfce(dados);
	let qrSvg: string | undefined;
	if (dados.qrcode) {
		try {
			qrSvg = svgQrCode(dados.qrcode);
		} catch {
			qrSvg = undefined;
		}
	}
	const html = montarHtmlDanfce(dados, qrSvg);
	const tipoRaw = await getConfig("impressora_tipo", "sistema");
	const tipo =
		tipoRaw === "rede" || tipoRaw === "arquivo" ? tipoRaw : "sistema";
	return enviarDanfceImpressora(
		{
			texto,
			html,
			qrcode: dados.qrcode,
		},
		{
			tipo,
			nome: await getConfig("impressora_nome", ""),
			host: await getConfig("impressora_host", ""),
			porta: Number(await getConfig("impressora_porta", "9100")) || 9100,
		},
	);
}
