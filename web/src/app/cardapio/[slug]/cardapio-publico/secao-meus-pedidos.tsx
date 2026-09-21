"use client";

import type { MeuPedidoCardapio } from "@/services/cardapio-publico.service";
import { formatarMoeda } from "./tipos";

function rotuloStatus(status: string) {
	if (status === "pendente") return "Pendente";
	if (status === "enviado_pdv") return "Recebido";
	if (status === "erro") return "Com erro";
	return status;
}

function formatarDataPedido(valor: string) {
	const data = new Date(valor);
	if (Number.isNaN(data.getTime())) return valor;
	return data.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function SecaoMeusPedidos({
	pedidos,
	carregando,
	telefone,
	onTelefone,
	onBuscar,
	onPedirNovamente,
}: {
	pedidos: MeuPedidoCardapio[];
	carregando: boolean;
	telefone: string;
	onTelefone: (valor: string) => void;
	onBuscar: () => void;
	onPedirNovamente: (pedido: MeuPedidoCardapio) => void;
}) {
	return (
		<section className="mt-5" style={{ color: "#0a0a0a" }}>
			<h2 className="text-lg font-bold">Seus últimos pedidos</h2>
			<p className="mt-1 text-sm font-medium" style={{ color: "#404040" }}>
				Informe o telefone usado no pedido para ver os 5 mais recentes.
			</p>
			<div className="mt-3 flex gap-2">
				<input
					type="tel"
					inputMode="tel"
					value={telefone}
					onChange={(event) => onTelefone(event.target.value)}
					placeholder="(00) 00000-0000"
					className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm font-medium outline-none"
					style={{ borderColor: "#d4d4d4", color: "#0a0a0a" }}
				/>
				<button
					type="button"
					onClick={onBuscar}
					className="shrink-0 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white"
				>
					Buscar
				</button>
			</div>

			{carregando ? (
				<p className="mt-4 text-sm font-medium" style={{ color: "#404040" }}>
					Carregando pedidos...
				</p>
			) : null}

			{!carregando && telefone.replace(/\D/g, "").length >= 10 && pedidos.length === 0 ? (
				<p className="mt-4 rounded-xl border border-dashed bg-white p-4 text-sm font-medium" style={{ borderColor: "#d4d4d4", color: "#404040" }}>
					Nenhum pedido encontrado para este telefone.
				</p>
			) : null}

			{pedidos.length > 0 ? (
				<ul className="mt-4 space-y-3">
					{pedidos.map((pedido) => (
						<li
							key={pedido.id}
							className="rounded-xl border bg-white p-3 shadow-sm"
							style={{ borderColor: "#d4d4d4" }}
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-bold">
										#{pedido.protocolo} · {rotuloStatus(pedido.status)}
									</p>
									<p className="mt-0.5 text-xs font-medium" style={{ color: "#404040" }}>
										{formatarDataPedido(pedido.criadoem)} ·{" "}
										{pedido.modalidade === "retirada" ? "Retirada" : "Entrega"}
									</p>
								</div>
								<p className="text-sm font-bold">{formatarMoeda(pedido.total)}</p>
							</div>
							<p className="mt-2 line-clamp-2 text-xs font-medium" style={{ color: "#404040" }}>
								{pedido.itens
									.map((item) => `${item.quantidade}x ${item.nomeproduto}`)
									.join(" · ")}
							</p>
							<button
								type="button"
								onClick={() => onPedirNovamente(pedido)}
								className="mt-3 w-full rounded-md bg-neutral-950 py-2 text-xs font-bold tracking-wide text-white uppercase"
							>
								Pedir novamente
							</button>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
