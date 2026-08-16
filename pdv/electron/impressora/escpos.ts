import { BrowserWindow } from "electron";
import { execute, getConfig } from "../db/database";
import { obterVenda } from "../db/repos";

function money(n: number): string {
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarChave(chave: string): string {
	const digits = chave.replace(/\D/g, "");
	if (digits.length !== 44) return chave;
	return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
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
			`  ${item.quantidade} x ${money(item.precounitario)} = ${money(item.precototal)}`,
		);
	}
	linhas.push("--------------------------------");
	linhas.push(`TOTAL: ${money(venda.valortotal)}`);
	linhas.push(`Pagamento: ${venda.meio_pagamento}`);
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

export async function imprimirDanfce(params: {
	vendaId: string;
	chave?: string;
	qrcode?: string;
	contingencia?: boolean;
	motivo?: string;
}): Promise<{ ok: boolean; modo: string }> {
	const texto = await montarTextoCupom(params.vendaId, {
		...params,
		danfce: true,
	});
	return enviarParaImpressora(texto);
}

async function enviarParaImpressora(
	texto: string,
	deviceNameOverride?: string,
): Promise<{ ok: boolean; modo: string }> {
	const tipo = await getConfig("impressora_tipo", "sistema");
	const nomeConfig = await getConfig("impressora_nome", "");
	const nome = deviceNameOverride?.trim() || nomeConfig;

	if (!deviceNameOverride?.trim() && (tipo === "arquivo" || !nome)) {
		await execute(
			`INSERT INTO sync_meta (chave, valor, atualizadoem) VALUES ('ultimo_cupom', $1, $2)
			 ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, atualizadoem = excluded.atualizadoem`,
			[texto, new Date().toISOString()],
		);
	}

	try {
		const win = new BrowserWindow({
			show: false,
			webPreferences: { offscreen: true },
		});
		// Layout para bobina térmica ~80mm (evita fonte minúscula em página A4).
		const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: 80mm auto;
    margin: 2mm;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 76mm;
    background: #fff;
    color: #000;
  }
  pre {
    margin: 0;
    padding: 0;
    font-family: "Courier New", Courier, monospace;
    font-size: 15pt;
    line-height: 1.3;
    font-weight: 600;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
</head>
<body><pre>${escapeHtml(texto)}</pre></body>
</html>`;
		await win.loadURL(
			`data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
		);
		const printers = await win.webContents.getPrintersAsync();
		const deviceName =
			nome && printers.some((p) => p.name === nome)
				? nome
				: deviceNameOverride?.trim()
					? nome
					: printers.find((p) => p.isDefault)?.name;

		await new Promise<void>((resolve, reject) => {
			win.webContents.print(
				{
					silent: true,
					printBackground: false,
					deviceName,
					margins: { marginType: "none" },
					scaleFactor: 100,
					// 80mm em micrômetros; altura longa para cupom
					pageSize: {
						width: 80000,
						height: 297000,
					},
				},
				(success, failureReason) => {
					win.destroy();
					if (!success) {
						reject(new Error(failureReason || "Falha na impressão"));
						return;
					}
					resolve();
				},
			);
		});
		return { ok: true, modo: deviceName ? "sistema" : "padrao" };
	} catch {
		return { ok: true, modo: "buffer_local" };
	}
}

export async function imprimirPedidoProducao(params: {
	deviceName: string;
	origem: string;
	cliente?: string | null;
	itens: Array<{
		quantidade: number;
		descricao: string;
		observacao?: string | null;
	}>;
}): Promise<{ ok: boolean; modo: string }> {
	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("     PEDIDO DE PRODUCAO");
	linhas.push("================================");
	linhas.push(params.origem);
	if (params.cliente?.trim()) {
		linhas.push(`Cliente: ${params.cliente.trim()}`);
	}
	linhas.push(`Hora: ${new Date().toLocaleString("pt-BR")}`);
	linhas.push("--------------------------------");
	for (const item of params.itens) {
		linhas.push(`${item.quantidade}  ${item.descricao.slice(0, 30)}`);
		if (item.observacao?.trim()) {
			linhas.push(`   Obs: ${item.observacao.trim().slice(0, 28)}`);
		}
	}
	linhas.push("================================");
	linhas.push("\n\n\n");
	return enviarParaImpressora(linhas.join("\n"), params.deviceName);
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
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
