import { BrowserWindow } from "electron";
import { getConfig } from "../db/database";
import { obterVenda } from "../db/repos";
import {
	type DadosComprovanteFechamentoCaixa,
	montarTextoComprovanteFechamentoCaixa,
} from "./comprovante-caixa";
import { linhasPagamentoCupom } from "./cupom-pagamentos";
import { type DestinoImpressora, enviarTextoImpressora } from "./destino";

export { imprimirDanfce } from "./danfce";

function money(n: number): string {
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarChave(chave: string): string {
	const digits = chave.replace(/\D/g, "");
	if (digits.length !== 44) return chave;
	return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatarQtd(n: number): string {
	const arred = Math.round(n * 1000) / 1000;
	if (Number.isInteger(arred)) return String(arred);
	return arred.toFixed(3).replace(".", ",");
}

async function montarTextoCupom(
	vendaId: string,
	extras?: {
		chave?: string;
		qrcode?: string;
		contingencia?: boolean;
		motivo?: string;
		danfce?: boolean;
	},
): Promise<string> {
	const venda = await obterVenda(vendaId);
	if (!venda) {
		return "Venda nao encontrada\n";
	}

	const fiscal = Boolean(extras?.danfce || extras?.chave);
	const linhas: string[] = [];
	linhas.push("================================");
	if (fiscal) {
		linhas.push(" DOCUMENTO AUXILIAR DA NFC-e");
		linhas.push("          DANFC-e");
	} else {
		linhas.push("       MAIS GESTAO - PDV");
		linhas.push("     CUPOM NAO FISCAL");
	}
	linhas.push("================================");
	linhas.push(`PDV: ${venda.numeropdv}`);
	linhas.push(`Venda: ${venda.id.slice(0, 8)}`);
	linhas.push(`Data: ${new Date(venda.criadoem).toLocaleString("pt-BR")}`);
	linhas.push("--------------------------------");
	for (const item of venda.itens) {
		linhas.push(item.descricao.slice(0, 32));
		linhas.push(
			`  ${formatarQtd(item.quantidade)} x ${money(item.precounitario)} = ${money(item.precototal)}`,
		);
	}
	linhas.push("--------------------------------");
	if ((venda.valordesconto ?? 0) > 0) {
		linhas.push(`Desconto: -${money(venda.valordesconto ?? 0)}`);
	}
	if ((venda.valortaxaservico ?? 0) > 0) {
		linhas.push(`Taxa servico: ${money(venda.valortaxaservico ?? 0)}`);
	}
	if ((venda.valorcouvert ?? 0) > 0) {
		linhas.push(`Couvert: ${money(venda.valorcouvert ?? 0)}`);
	}
	linhas.push(`TOTAL: ${money(venda.valortotal)}`);
	linhas.push(...linhasPagamentoCupom(venda));
	if (venda.valortroco > 0) {
		linhas.push(`Troco: ${money(venda.valortroco)}`);
	}
	if (extras?.contingencia) {
		linhas.push("--------------------------------");
		linhas.push("*** NFC-e EM CONTINGENCIA ***");
		linhas.push(extras.motivo?.slice(0, 40) ?? "Sem comunicacao SEFAZ/API");
	}
	if (extras?.chave) {
		linhas.push("--------------------------------");
		linhas.push("CHAVE DE ACESSO");
		linhas.push(formatarChave(extras.chave));
	}
	if (extras?.qrcode) {
		linhas.push("--------------------------------");
		linhas.push("Consulte pela chave de acesso");
		linhas.push("ou pelo QR Code:");
		linhas.push(extras.qrcode);
	}
	linhas.push("================================");
	linhas.push("Obrigado pela preferencia!");
	linhas.push("\n\n\n");
	return linhas.join("\n");
}

export async function imprimirCupomNaoFiscal(
	vendaId: string,
): Promise<{ ok: boolean; modo: string }> {
	const texto = await montarTextoCupom(vendaId);
	return enviarParaImpressora(texto);
}

export type ContaPreContaImpressao = {
	numero_mesa: number;
	nomecliente?: string | null;
	numeropessoas: number;
	subtotal: number;
	valordesconto: number;
	valortaxaservico: number;
	valorcouvert: number;
	valorpago: number;
	valorrestante: number;
	status: string;
	itens: Array<{
		descricao: string;
		quantidade: number;
		precounitario: number;
		precototal: number;
	}>;
};

export async function imprimirPreConta(
	idcontaOuConta: string | ContaPreContaImpressao,
): Promise<{
	ok: boolean;
	modo: string;
}> {
	let conta: ContaPreContaImpressao;
	if (typeof idcontaOuConta === "string") {
		const { obterContaMesa } = await import("../db/repos");
		const local = await obterContaMesa(idcontaOuConta);
		if (!local || local.status !== "aberta") {
			throw new Error("Conta inválida");
		}
		conta = local;
	} else {
		conta = idcontaOuConta;
		if (conta.status !== "aberta") {
			throw new Error("Conta inválida");
		}
	}
	if (!conta.itens.length) {
		throw new Error("Conta sem itens para conferência");
	}
	const modelo =
		(await getConfig("modelo_atendimento", "mesa")) === "comanda"
			? "Comanda"
			: "Mesa";
	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("     CONFERENCIA / PRE-CONTA");
	linhas.push("  NAO E DOCUMENTO FISCAL");
	linhas.push("================================");
	linhas.push(`${modelo}: ${conta.numero_mesa}`);
	if (conta.nomecliente) {
		linhas.push(`Cliente: ${conta.nomecliente.slice(0, 28)}`);
	}
	linhas.push(`Pessoas: ${conta.numeropessoas}`);
	linhas.push(`Data: ${new Date().toLocaleString("pt-BR")}`);
	linhas.push("--------------------------------");
	for (const item of conta.itens) {
		linhas.push(item.descricao.slice(0, 32));
		linhas.push(
			`  ${formatarQtd(item.quantidade)} x ${money(item.precounitario)} = ${money(item.precototal)}`,
		);
	}
	linhas.push("--------------------------------");
	linhas.push(`Subtotal: ${money(conta.subtotal)}`);
	if (conta.valordesconto > 0) {
		linhas.push(`Desconto: -${money(conta.valordesconto)}`);
	}
	if (conta.valortaxaservico > 0) {
		linhas.push(`Taxa servico: ${money(conta.valortaxaservico)}`);
	}
	if (conta.valorcouvert > 0) {
		linhas.push(`Couvert: ${money(conta.valorcouvert)}`);
	}
	if (conta.valorpago > 0) {
		linhas.push(`Ja pago: ${money(conta.valorpago)}`);
	}
	linhas.push(`TOTAL: ${money(conta.valorrestante)}`);
	linhas.push("================================");
	linhas.push("Confira os itens antes de pagar.");
	linhas.push("\n\n\n");
	return enviarParaImpressora(linhas.join("\n"));
}

export async function imprimirComprovanteFechamentoCaixa(
	dados: DadosComprovanteFechamentoCaixa,
): Promise<{ ok: boolean; modo: string }> {
	return enviarParaImpressora(montarTextoComprovanteFechamentoCaixa(dados));
}

async function destinoFiscal(): Promise<DestinoImpressora> {
	const tipoRaw = await getConfig("impressora_tipo", "sistema");
	const tipo: DestinoImpressora["tipo"] =
		tipoRaw === "rede" || tipoRaw === "arquivo" ? tipoRaw : "sistema";
	return {
		tipo,
		nome: await getConfig("impressora_nome", ""),
		host: await getConfig("impressora_host", ""),
		porta: Number(await getConfig("impressora_porta", "9100")) || 9100,
	};
}

async function enviarParaImpressora(
	texto: string,
	destino?: DestinoImpressora,
): Promise<{ ok: boolean; modo: string }> {
	return enviarTextoImpressora(texto, destino ?? (await destinoFiscal()));
}

export async function imprimirPedidoProducao(params: {
	destino: DestinoImpressora;
	origem: string;
	cliente?: string | null;
	itens: Array<{
		quantidade: number;
		descricao: string;
		observacao?: string | null;
	}>;
	reimpressao?: boolean;
}): Promise<{ ok: boolean; modo: string }> {
	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("     PEDIDO DE PRODUCAO");
	if (params.reimpressao) {
		linhas.push("     *** REIMPRESSAO ***");
	}
	linhas.push("================================");
	linhas.push(params.origem);
	if (params.cliente?.trim()) {
		linhas.push(`Cliente: ${params.cliente.trim()}`);
	}
	linhas.push(`Hora: ${new Date().toLocaleString("pt-BR")}`);
	linhas.push("--------------------------------");
	for (const item of params.itens) {
		linhas.push(
			`${formatarQtd(item.quantidade)}  ${item.descricao.slice(0, 30)}`,
		);
		if (item.observacao?.trim()) {
			linhas.push(`   Obs: ${item.observacao.trim().slice(0, 28)}`);
		}
	}
	linhas.push("================================");
	linhas.push("\n\n\n");
	return enviarParaImpressora(linhas.join("\n"), params.destino);
}

export async function testarImpressora(
	destino: DestinoImpressora,
): Promise<{ ok: boolean; modo: string }> {
	const linhas = [
		"================================",
		"     TESTE DE IMPRESSORA",
		"================================",
		"Mais Gestao - PDV",
		`Hora: ${new Date().toLocaleString("pt-BR")}`,
		`Tipo: ${destino.tipo}`,
		destino.tipo === "rede"
			? `Rede: ${destino.host?.trim() || "?"}:${destino.porta || 9100}`
			: `Sistema: ${destino.nome?.trim() || "padrao"}`,
		"--------------------------------",
		"Se este cupom saiu, a impressora",
		"esta configurada corretamente.",
		"================================",
		"\n\n\n",
	];
	return enviarTextoImpressora(linhas.join("\n"), destino, { estrito: true });
}

export async function listarImpressoras(): Promise<
	Array<{ name: string; isDefault: boolean }>
> {
	const win = new BrowserWindow({
		show: false,
		webPreferences: { offscreen: true },
	});
	try {
		await win.loadURL("data:text/html,<html></html>");
		const printers = await win.webContents.getPrintersAsync();
		return printers.map((p) => ({ name: p.name, isDefault: p.isDefault }));
	} finally {
		win.destroy();
	}
}
