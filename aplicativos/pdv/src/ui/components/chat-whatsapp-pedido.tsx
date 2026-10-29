"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { onWhatsappEvent, pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type Mensagem = {
	id: string;
	direcao: "in" | "out" | "system";
	corpo: string;
	criadoem: string;
};

type Conversa = {
	id: string;
	status?: "aberta" | "finalizada";
};

export function ChatWhatsappPedido({
	aberto,
	idconta,
	telefone,
	nomecliente,
	onFechar,
}: {
	aberto: boolean;
	idconta: string;
	telefone: string | null;
	nomecliente: string | null;
	onFechar: () => void;
}) {
	const [mensagens, setMensagens] = useState<Mensagem[]>([]);
	const [conversa, setConversa] = useState<Conversa | null>(null);
	const [texto, setTexto] = useState("");
	const [loading, setLoading] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [erro, setErro] = useState("");
	const fimRef = useRef<HTMLDivElement | null>(null);
	useEscapeFechaModal(aberto, onFechar);
	const finalizada = conversa?.status === "finalizada";

	async function carregar() {
		if (!aberto) return;
		setLoading(true);
		setErro("");
		try {
			const res = await pdvInvoke<{
				conversa: Conversa | null;
				mensagens: Mensagem[];
			}>("whatsapp.listarMensagens", {
				idconta,
				telefone: telefone ?? undefined,
			});
			setConversa(res.conversa ?? null);
			setMensagens(res.mensagens ?? []);
			await pdvInvoke("whatsapp.marcarLidas", {
				idconta,
				telefone: telefone ?? undefined,
			});
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao carregar chat");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void carregar();
	}, [aberto, idconta, telefone]);

	useEffect(() => {
		if (!aberto) return;
		return onWhatsappEvent((payload) => {
			const evento = payload as {
				tipo?: string;
				idconta?: string | null;
				idconversa?: string | null;
			};
			if (evento.tipo !== "mensagem") return;
			const mesmaConta = Boolean(evento.idconta) && evento.idconta === idconta;
			const mesmaConversa =
				Boolean(evento.idconversa) &&
				Boolean(conversa?.id) &&
				evento.idconversa === conversa?.id;
			if (mesmaConta || mesmaConversa) {
				void carregar();
			}
		});
	}, [aberto, idconta, conversa?.id]);

	useEffect(() => {
		fimRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [mensagens.length]);

	async function enviar() {
		const corpo = texto.trim();
		if (!corpo || enviando || finalizada) return;
		setEnviando(true);
		setErro("");
		try {
			await pdvInvoke("whatsapp.enviarMensagem", {
				idconta,
				telefone: telefone ?? undefined,
				corpo,
			});
			setTexto("");
			await carregar();
		} catch (err) {
			setErro(err instanceof Error ? err.message : "Falha ao enviar");
		} finally {
			setEnviando(false);
		}
	}

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50">
			<section className="flex h-full w-full max-w-md flex-col border-l bg-background shadow-xl">
				<header className="flex items-center gap-2 border-b px-4 py-3">
					<MessageCircle className="size-5 text-primary" />
					<div className="min-w-0 flex-1">
						<p className="truncate font-semibold">{nomecliente || "Cliente"}</p>
						<p className="truncate text-xs text-muted-foreground">
							{telefone || "Sem telefone"}
						</p>
					</div>
					<Button size="sm" variant="ghost" onClick={onFechar}>
						<X className="size-4" />
					</Button>
				</header>

				<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
					{loading ? (
						<p className="text-sm text-muted-foreground">Carregando…</p>
					) : null}
					{erro ? <p className="text-sm text-destructive">{erro}</p> : null}
					{!loading && mensagens.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma mensagem ainda. Envie a primeira.
						</p>
					) : null}
					{mensagens.map((msg) => (
						<div
							key={msg.id}
							className={`flex max-w-[85%] flex-col rounded-lg px-3 py-2 text-sm ${
								msg.direcao === "out"
									? "self-end bg-primary text-primary-foreground"
									: msg.direcao === "system"
										? "self-center bg-muted text-muted-foreground"
										: "self-start bg-muted"
							}`}
						>
							{msg.direcao !== "system" ? (
								<p className="mb-0.5 text-[10px] font-semibold opacity-80">
									{msg.direcao === "out" ? "Operador" : "Cliente"}
								</p>
							) : null}
							<p className="whitespace-pre-wrap break-words">{msg.corpo}</p>
							<p className="mt-1 text-[10px] opacity-70">
								{new Date(msg.criadoem).toLocaleString("pt-BR")}
							</p>
						</div>
					))}
					<div ref={fimRef} />
				</div>

				{finalizada ? (
					<p className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
						Conversa finalizada — pedido entregue.
					</p>
				) : null}

				<form
					className="flex gap-2 border-t p-3"
					onSubmit={(e) => {
						e.preventDefault();
						void enviar();
					}}
				>
					<input
						className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
						value={texto}
						disabled={!telefone || enviando || finalizada}
						placeholder={
							finalizada
								? "Conversa finalizada"
								: telefone
									? "Escreva uma mensagem…"
									: "Pedido sem telefone"
						}
						onChange={(e) => setTexto(e.target.value)}
					/>
					<Button
						type="submit"
						size="sm"
						disabled={!telefone || !texto.trim() || enviando || finalizada}
					>
						<Send className="size-4" />
					</Button>
				</form>
			</section>
		</div>
	);
}
