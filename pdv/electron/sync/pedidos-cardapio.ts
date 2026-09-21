import {
	ackPedidoCardapioDelivery,
	listarPedidosCardapioPendentes,
} from "../api/client";
import { obterSessao } from "../db/repos";
import { localApi } from "../local-api";
import { mapearPedidoCardapioParaIngest } from "./pedidos-cardapio-mapa";

const INTERVALO_MS = 4000;
let timer: NodeJS.Timeout | null = null;
let emCurso = false;

export async function puxarPedidosCardapioDelivery(): Promise<void> {
	if (emCurso) return;
	let sessao: Awaited<ReturnType<typeof obterSessao>>;
	try {
		sessao = await obterSessao();
	} catch {
		return;
	}
	if (!sessao.token || !sessao.idempresa || !sessao.modulogourmet) {
		return;
	}
	emCurso = true;
	try {
		const pedidos = await listarPedidosCardapioPendentes(sessao.idempresa);
		for (const pedido of pedidos) {
			try {
				const resultado = await localApi.ingestPedidoDelivery(
					mapearPedidoCardapioParaIngest(pedido),
				);
				await ackPedidoCardapioDelivery({
					id: pedido.id,
					idempresa: sessao.idempresa,
					sucesso: true,
					idcontamensalocal: resultado.conta.id,
				});
			} catch (erro) {
				await ackPedidoCardapioDelivery({
					id: pedido.id,
					idempresa: sessao.idempresa,
					sucesso: false,
					mensagemerro:
						erro instanceof Error ? erro.message : "Falha ao ingerir pedido",
				}).catch(() => undefined);
			}
		}
	} catch {
		// PDV offline: tenta de novo no próximo ciclo
	} finally {
		emCurso = false;
	}
}

export function iniciarPollerCardapioDelivery(
	intervalMs = INTERVALO_MS,
): () => void {
	if (timer) {
		clearInterval(timer);
	}
	timer = setInterval(() => {
		void puxarPedidosCardapioDelivery();
	}, intervalMs);
	void puxarPedidosCardapioDelivery();
	return () => {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	};
}
