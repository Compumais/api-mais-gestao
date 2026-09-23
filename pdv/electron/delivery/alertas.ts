import { BrowserWindow, Notification, shell } from "electron";

export type PedidoDeliveryNovo = {
	id: string;
	modalidade: string;
	senha: string | null;
	nomecliente: string | null;
};

let naoVistos = 0;

export function pedidosDeliveryNaoVistos(): number {
	return naoVistos;
}

export function marcarPedidosDeliveryVistos(): void {
	naoVistos = 0;
}

export function tituloAlertaPedidoDelivery(pedido: PedidoDeliveryNovo): string {
	const tipo = pedido.modalidade === "retirada" ? "Retirada" : "Delivery";
	const senha = pedido.senha?.trim();
	return senha ? `Novo pedido ${tipo} #${senha}` : `Novo pedido ${tipo}`;
}

export function avisarPedidoDeliveryNovo(pedido: PedidoDeliveryNovo): void {
	naoVistos += 1;
	const titulo = tituloAlertaPedidoDelivery(pedido);
	const corpo = (pedido.nomecliente ?? "").trim() || "Novo pedido no cardápio";
	if (Notification.isSupported()) {
		new Notification({ title: titulo, body: corpo }).show();
	}
	try {
		shell.beep();
	} catch {
		// beep é opcional
	}
	for (const win of BrowserWindow.getAllWindows()) {
		if (!win.isDestroyed() && !win.isFocused()) {
			win.flashFrame(true);
		}
		if (!win.isDestroyed()) {
			win.webContents.send("delivery:evento", {
				tipo: "pedido-novo",
				...pedido,
				titulo,
				corpo,
			});
		}
	}
}
