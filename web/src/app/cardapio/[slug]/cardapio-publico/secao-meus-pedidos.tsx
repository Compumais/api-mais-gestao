"use client";

import { useEffect, useState } from "react";
import { maskPhone } from "@/lib/masks";
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
	onConfirmarTelefone,
	onPedirNovamente,
}: {
	pedidos: MeuPedidoCardapio[];
	carregando: boolean;
	telefone: string;
	onConfirmarTelefone: (telefone: string) => void;
	onPedirNovamente: (pedido: MeuPedidoCardapio) => void;
}) {
	const digitos = telefone.replace(/\D/g, "");
	const temTelefone = digitos.length >= 10;
	const [modalAberto, setModalAberto] = useState(false);
	const [telefoneModal, setTelefoneModal] = useState("");

	useEffect(() => {
		if (modalAberto) {
			setTelefoneModal(telefone ? maskPhone(telefone) : "");
		}
	}, [modalAberto, telefone]);

	function confirmarModal() {
		const valor = telefoneModal.replace(/\D/g, "");
		onConfirmarTelefone(valor);
		setModalAberto(false);
	}

	return (
		<section className="mt-5" style={{ color: "#0a0a0a" }}>
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="text-lg font-bold">Seus últimos pedidos</h2>
					{temTelefone ? (
						<p className="mt-1 text-sm font-medium" style={{ color: "#404040" }}>
							Telefone {maskPhone(digitos)}
						</p>
					) : (
						<p className="mt-1 text-sm font-medium" style={{ color: "#404040" }}>
							Informe o telefone usado no pedido para ver os 5 mais recentes.
						</p>
					)}
				</div>
				<button
					type="button"
					onClick={() => setModalAberto(true)}
					className="shrink-0 rounded-xl border bg-white px-3 py-2 text-xs font-bold"
					style={{ borderColor: "#d4d4d4", color: "#0a0a0a" }}
				>
					{temTelefone ? "Alterar" : "Informar telefone"}
				</button>
			</div>

			{carregando ? (
				<p className="mt-4 text-sm font-medium" style={{ color: "#404040" }}>
					Carregando pedidos...
				</p>
			) : null}

			{!carregando && temTelefone && pedidos.length === 0 ? (
				<p
					className="mt-4 rounded-xl border border-dashed bg-white p-4 text-sm font-medium"
					style={{ borderColor: "#d4d4d4", color: "#404040" }}
				>
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
									<p
										className="mt-0.5 text-xs font-medium"
										style={{ color: "#404040" }}
									>
										{formatarDataPedido(pedido.criadoem)} ·{" "}
										{pedido.modalidade === "retirada" ? "Retirada" : "Entrega"}
									</p>
								</div>
								<p className="text-sm font-bold">{formatarMoeda(pedido.total)}</p>
							</div>
							<p
								className="mt-2 line-clamp-2 text-xs font-medium"
								style={{ color: "#404040" }}
							>
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

			{modalAberto ? (
				<div
					className="fixed inset-0 z-50 flex items-end bg-black/50 p-4 sm:items-center sm:justify-center"
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-telefone-titulo"
					onClick={() => setModalAberto(false)}
					onKeyDown={(event) => {
						if (event.key === "Escape") setModalAberto(false);
					}}
				>
					<form
						className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
						style={{ color: "#0a0a0a" }}
						onClick={(event) => event.stopPropagation()}
						onSubmit={(event) => {
							event.preventDefault();
							confirmarModal();
						}}
					>
						<h3 id="modal-telefone-titulo" className="text-lg font-bold">
							Seus últimos pedidos
						</h3>
						<p className="mt-1 text-sm font-medium" style={{ color: "#404040" }}>
							Informe o telefone usado no pedido para ver os 5 mais recentes.
						</p>
						<label className="mt-4 block">
							<span className="sr-only">Telefone</span>
							<input
								type="tel"
								inputMode="tel"
								autoFocus
								value={telefoneModal}
								onChange={(event) =>
									setTelefoneModal(maskPhone(event.target.value))
								}
								placeholder="(00) 00000-0000"
								className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium outline-none"
								style={{ borderColor: "#d4d4d4", color: "#0a0a0a" }}
							/>
						</label>
						<div className="mt-4 flex gap-2">
							<button
								type="button"
								onClick={() => setModalAberto(false)}
								className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold"
								style={{ borderColor: "#d4d4d4", color: "#0a0a0a" }}
							>
								Cancelar
							</button>
							<button
								type="submit"
								className="flex-1 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white"
							>
								Buscar
							</button>
						</div>
					</form>
				</div>
			) : null}
		</section>
	);
}
