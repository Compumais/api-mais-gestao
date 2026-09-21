"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatarMoeda, type PedidoSucesso } from "./tipos";

export function CardapioPublicoSucesso({
	pedido,
	onNovoPedido,
}: {
	pedido: PedidoSucesso;
	onNovoPedido: () => void;
}) {
	return (
		<main className="mx-auto max-w-md px-4 py-16 text-center text-neutral-950">
			<h1 className="text-2xl font-black">Pedido recebido</h1>
			<p className="mt-2 font-medium text-neutral-700">
				Protocolo <strong className="text-neutral-950">{pedido.protocolo}</strong>
			</p>
			<p className="mt-1 text-lg font-bold">{formatarMoeda(pedido.total)}</p>
			{pedido.pixCopiaCola ? (
				<div className="mt-6 rounded-xl bg-white p-4">
					<p className="text-sm font-medium">Pague com PIX</p>
					<img
						alt="QR Code PIX"
						className="mx-auto mt-3 size-48"
						src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pedido.pixCopiaCola)}`}
					/>
					<Button
						className="mt-3 w-full"
						variant="outline"
						onClick={() => {
							void navigator.clipboard.writeText(pedido.pixCopiaCola ?? "");
							toast.success("PIX copiado");
						}}
					>
						Copiar código PIX
					</Button>
				</div>
			) : null}
			<Button className="mt-6" variant="outline" onClick={onNovoPedido}>
				Fazer novo pedido
			</Button>
		</main>
	);
}
