import {
	Bike,
	Clock3,
	MapPin,
	MessageCircle,
	Package,
	Phone,
	Plus,
	RefreshCw,
	Settings,
	XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { onDeliveryEvent, onWhatsappEvent, pdvInvoke } from "@/lib/pdv-api";
import type { StatusContext } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { AvisoSecundario } from "@/ui/components/aviso-secundario";
import { ChatWhatsappPedido } from "@/ui/components/chat-whatsapp-pedido";
import { FunctionBar } from "@/ui/components/function-bar";
import { PdvShell } from "@/ui/components/pdv-shell";
import { Topbar } from "@/ui/components/topbar";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

type ContaEntrega = {
	id: string;
	modalidade: "delivery" | "retirada" | "mesa";
	nomecliente: string | null;
	telefone: string | null;
	endereco: string | null;
	bairro: string | null;
	valorentrega: number;
	valortotal: number;
	status_entrega: string | null;
	senha_chamada: string | null;
	abertoem: string;
};

type ClientePdv = {
	id: string;
	nome: string;
	telefone: string | null;
	endereco: string | null;
	bairro: string | null;
	complemento: string | null;
	referencia: string | null;
};

type ModalidadeNova = "delivery" | "retirada";

function rotuloStatus(status: string | null) {
	switch (status) {
		case "producao":
			return "Produção";
		case "saiu":
			return "Saiu";
		case "entregue":
			return "Entregue";
		default:
			return "Recebido";
	}
}

function varianteStatus(status: string | null) {
	if (status === "entregue") return "success" as const;
	if (status === "saiu") return "default" as const;
	if (status === "producao") return "warning" as const;
	return "secondary" as const;
}

function tempoAberto(iso: string) {
	const ms = Date.now() - new Date(iso).getTime();
	const min = Math.max(0, Math.floor(ms / 60000));
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	return `${h}h ${min % 60}m`;
}

export function DeliveryPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const [pedidos, setPedidos] = useState<ContaEntrega[]>([]);
	const [filtro, setFiltro] = useState<string>("");
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [abrir, setAbrir] = useState(false);
	const [modalidade, setModalidade] = useState<ModalidadeNova>("delivery");
	const [nome, setNome] = useState("");
	const [telefone, setTelefone] = useState("");
	const [endereco, setEndereco] = useState("");
	const [bairro, setBairro] = useState("");
	const [complemento, setComplemento] = useState("");
	const [referencia, setReferencia] = useState("");
	const [taxa, setTaxa] = useState("");
	const [clientes, setClientes] = useState<ClientePdv[]>([]);
	const [idcliente, setIdcliente] = useState<string | null>(null);
	const [chatConta, setChatConta] = useState<ContaEntrega | null>(null);
	const [naoLidasMap, setNaoLidasMap] = useState<Record<string, number>>({});
	const [cancelando, setCancelando] = useState<ContaEntrega | null>(null);

	useEscapeFechaModal(abrir, () => setAbrir(false));
	useEscapeFechaModal(Boolean(cancelando), () => setCancelando(null));

	const carregarNaoLidas = useCallback(async () => {
		try {
			const rows = await pdvInvoke<
				Array<{ idconta: string; nao_lidas: number }>
			>("whatsapp.naoLidasPorConta");
			const mapa: Record<string, number> = {};
			for (const row of rows) {
				mapa[row.idconta] = Number(row.nao_lidas) || 0;
			}
			setNaoLidasMap(mapa);
		} catch {
			setNaoLidasMap({});
		}
	}, []);

	const carregar = useCallback(async () => {
		setLoading(true);
		setMsg("");
		try {
			const data = await pdvInvoke<ContaEntrega[]>(
				"listarPedidosEntrega",
				filtro || null,
			);
			setPedidos(data);
			void carregarNaoLidas();
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao listar delivery");
		} finally {
			setLoading(false);
		}
	}, [filtro, carregarNaoLidas]);

	useEffect(() => {
		void pdvInvoke("marcarPedidosDeliveryVistos");
		void carregar();
		const timer = window.setInterval(() => {
			void carregar();
		}, 4000);
		const offDelivery = onDeliveryEvent(() => {
			void pdvInvoke("marcarPedidosDeliveryVistos");
			void carregar();
		});
		return () => {
			window.clearInterval(timer);
			offDelivery();
		};
	}, [carregar]);

	useEffect(() => {
		return onWhatsappEvent(() => {
			void carregarNaoLidas();
		});
	}, [carregarNaoLidas]);

	async function buscarClientes(termo: string) {
		try {
			setClientes(
				await pdvInvoke<ClientePdv[]>("buscarClientesPdv", termo, 20),
			);
		} catch {
			setClientes([]);
		}
	}

	function selecionarCliente(c: ClientePdv) {
		setIdcliente(c.id);
		setNome(c.nome);
		setTelefone(c.telefone ?? "");
		setEndereco(c.endereco ?? "");
		setBairro(c.bairro ?? "");
		setComplemento(c.complemento ?? "");
		setReferencia(c.referencia ?? "");
		setClientes([]);
	}

	async function confirmarAbrir() {
		setLoading(true);
		setMsg("");
		try {
			if (nome.trim()) {
				await pdvInvoke("salvarClientePdv", {
					id: idcliente ?? undefined,
					nome: nome.trim(),
					telefone: telefone.trim() || null,
					endereco: endereco.trim() || null,
					bairro: bairro.trim() || null,
					complemento: complemento.trim() || null,
					referencia: referencia.trim() || null,
				});
			}
			const conta = await pdvInvoke<ContaEntrega>("abrirPedidoEntrega", {
				modalidade,
				nomecliente: nome.trim() || null,
				telefone: telefone.trim() || null,
				endereco: endereco.trim() || null,
				bairro: bairro.trim() || null,
				complemento: complemento.trim() || null,
				referencia: referencia.trim() || null,
				valorentrega:
					taxa.trim() !== "" ? Number(taxa.replace(",", ".")) : null,
				idcliente,
			});
			setAbrir(false);
			navigate(`/delivery/${conta.id}`);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao abrir pedido");
		} finally {
			setLoading(false);
		}
	}

	async function avancarStatus(id: string) {
		try {
			await pdvInvoke("atualizarStatusEntrega", id);
			await carregar();
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao atualizar status");
		}
	}

	async function confirmarCancelarPedido() {
		if (!cancelando) return;
		const alvo = cancelando;
		setCancelando(null);
		setLoading(true);
		setMsg("");
		try {
			await pdvInvoke("cancelarContaMesa", alvo.id);
			await carregar();
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao cancelar pedido");
		} finally {
			setLoading(false);
		}
	}

	const titulo = useMemo(
		() =>
			status?.sessao.nomeempresa
				? `Delivery — ${status.sessao.nomeempresa}`
				: "Delivery",
		[status?.sessao.nomeempresa],
	);

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			topbar={
				<Topbar
					title={titulo}
					subtitle="Pedidos de entrega e retirada"
					status={status}
				/>
			}
			footer={
				<>
					<FunctionBar
						actions={[
							{
								key: "novo",
								label: "Novo",
								hotkey: "F6",
								variant: "default",
								onClick: () => setAbrir(true),
							},
							{
								key: "atualizar",
								label: "Atualizar",
								hotkey: "F5",
								variant: "secondary",
								onClick: () => void carregar(),
								disabled: loading,
							},
							{
								key: "config",
								label: "Impressoras",
								hotkey: "F8",
								variant: "outline",
								onClick: () => navigate("/config?aba=delivery"),
							},
							{
								key: "voltar",
								label: "Voltar",
								hotkey: "Esc",
								variant: "outline",
								onClick: () => navigate("/"),
							},
						]}
					/>

					{abrir ? (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
							<div className="pdv-surface max-h-[90vh] w-full max-w-lg overflow-auto p-4">
								<h2 className="mb-3 text-lg font-semibold">Novo pedido</h2>
								<div className="mb-3 flex gap-2">
									<Button
										variant={modalidade === "delivery" ? "default" : "outline"}
										onClick={() => setModalidade("delivery")}
									>
										Delivery
									</Button>
									<Button
										variant={modalidade === "retirada" ? "default" : "outline"}
										onClick={() => setModalidade("retirada")}
									>
										Retirada
									</Button>
								</div>
								<div className="space-y-3">
									<div>
										<Label>Telefone / nome</Label>
										<Input
											value={telefone || nome}
											placeholder="Buscar cliente..."
											onChange={(e) => {
												const v = e.target.value;
												if (/^\d/.test(v)) {
													setTelefone(v);
													void buscarClientes(v);
												} else {
													setNome(v);
													void buscarClientes(v);
												}
											}}
										/>
										{clientes.length > 0 ? (
											<ul className="mt-1 max-h-32 overflow-auto rounded border border-border text-sm">
												{clientes.map((c) => (
													<li key={c.id}>
														<button
															type="button"
															className="w-full px-2 py-1.5 text-left hover:bg-muted"
															onClick={() => selecionarCliente(c)}
														>
															{c.nome}
															{c.telefone ? ` · ${c.telefone}` : ""}
														</button>
													</li>
												))}
											</ul>
										) : null}
									</div>
									<div>
										<Label>Nome</Label>
										<Input
											value={nome}
											onChange={(e) => setNome(e.target.value)}
										/>
									</div>
									<div>
										<Label>Telefone</Label>
										<Input
											value={telefone}
											onChange={(e) => setTelefone(e.target.value)}
										/>
									</div>
									{modalidade === "delivery" ? (
										<>
											<div>
												<Label>Endereço</Label>
												<Input
													value={endereco}
													onChange={(e) => setEndereco(e.target.value)}
												/>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<Label>Bairro</Label>
													<Input
														value={bairro}
														onChange={(e) => setBairro(e.target.value)}
													/>
												</div>
												<div>
													<Label>Taxa entrega</Label>
													<Input
														value={taxa}
														placeholder="Automática"
														onChange={(e) => setTaxa(e.target.value)}
													/>
												</div>
											</div>
											<div>
												<Label>Complemento</Label>
												<Input
													value={complemento}
													onChange={(e) => setComplemento(e.target.value)}
												/>
											</div>
											<div>
												<Label>Referência</Label>
												<Input
													value={referencia}
													onChange={(e) => setReferencia(e.target.value)}
												/>
											</div>
										</>
									) : null}
								</div>
								<div className="mt-4 flex justify-end gap-2">
									<Button variant="outline" onClick={() => setAbrir(false)}>
										Cancelar
									</Button>
									<Button
										disabled={loading}
										onClick={() => void confirmarAbrir()}
									>
										Abrir pedido
									</Button>
								</div>
							</div>
						</div>
					) : null}
					{cancelando ? (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
							<div className="pdv-surface w-full max-w-md space-y-4 p-5">
								<h2 className="text-lg font-semibold">Cancelar pedido</h2>
								<p className="text-sm text-muted-foreground">
									Cancelar o pedido #{cancelando.senha_chamada ?? "—"} de{" "}
									{cancelando.nomecliente || "cliente sem nome"}? Os itens serão
									desconsiderados. Esta ação não pode ser desfeita.
								</p>
								<div className="flex justify-end gap-2">
									<Button variant="outline" onClick={() => setCancelando(null)}>
										Voltar
									</Button>
									<Button
										variant="destructive"
										disabled={loading}
										onClick={() => void confirmarCancelarPedido()}
									>
										Confirmar cancelamento
									</Button>
								</div>
							</div>
						</div>
					) : null}
				</>
			}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
				<AvisoSecundario status={status} />
				{msg ? (
					<p className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{msg}
					</p>
				) : null}

				<div className="flex shrink-0 flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
					<div className="flex flex-wrap items-center gap-1.5">
						<Button
							size="sm"
							variant={filtro === "" ? "default" : "ghost"}
							onClick={() => setFiltro("")}
						>
							Todos
							<Badge
								variant={filtro === "" ? "secondary" : "outline"}
								className="ml-1"
							>
								{pedidos.length}
							</Badge>
						</Button>
						{["recebido", "producao", "saiu"].map((s) => (
							<Button
								key={s}
								size="sm"
								variant={filtro === s ? "default" : "ghost"}
								onClick={() => setFiltro(s)}
							>
								{rotuloStatus(s)}
							</Button>
						))}
					</div>
					<div className="ml-auto flex items-center gap-2">
						{status?.podeConfigurar ? (
							<Button
								size="sm"
								variant="outline"
								onClick={() => navigate("/config?aba=delivery")}
							>
								<Settings className="mr-1 size-4" />
								Config. delivery
							</Button>
						) : null}
						<Button
							size="sm"
							variant="outline"
							disabled={loading}
							onClick={() => void carregar()}
						>
							<RefreshCw className={loading ? "animate-spin" : ""} />
							Atualizar
						</Button>
						<Button size="sm" onClick={() => setAbrir(true)}>
							<Plus className="mr-1 size-4" />
							Novo pedido
						</Button>
					</div>
				</div>

				<div className="pdv-surface min-h-0 flex-1 overflow-auto border shadow-sm">
					<table className="w-full text-sm">
						<thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
							<tr>
								<th className="px-3 py-2.5 font-semibold">Senha</th>
								<th className="px-3 py-2.5 font-semibold">Cliente</th>
								<th className="px-3 py-2.5 font-semibold">Tipo</th>
								<th className="px-3 py-2.5 font-semibold">Status</th>
								<th className="px-3 py-2.5 text-right font-semibold">Total</th>
								<th className="px-3 py-2.5 font-semibold">Tempo</th>
								<th className="px-3 py-2" />
							</tr>
						</thead>
						<tbody>
							{pedidos.map((p) => (
								<tr
									key={p.id}
									className="border-t border-border/70 transition-colors hover:bg-muted/40"
								>
									<td className="px-3 py-2.5 font-mono text-base font-bold text-primary">
										#{p.senha_chamada ?? "—"}
									</td>
									<td className="px-3 py-2.5">
										<div className="font-medium">
											{p.nomecliente || "Sem nome"}
										</div>
										{p.telefone ? (
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Phone className="size-3" />
												{p.telefone}
											</div>
										) : null}
										{p.modalidade === "delivery" && p.endereco ? (
											<div className="flex max-w-80 items-center gap-1 truncate text-xs text-muted-foreground">
												<MapPin className="size-3 shrink-0" />
												{p.endereco}
												{p.bairro ? ` — ${p.bairro}` : ""}
											</div>
										) : null}
									</td>
									<td className="px-3 py-2.5">
										<span className="inline-flex items-center gap-1.5 font-medium">
											{p.modalidade === "delivery" ? (
												<Bike className="size-4 text-primary" />
											) : (
												<Package className="size-4 text-primary" />
											)}
											{p.modalidade === "delivery" ? "Delivery" : "Retirada"}
										</span>
									</td>
									<td className="px-3 py-2.5">
										<Badge variant={varianteStatus(p.status_entrega)}>
											{rotuloStatus(p.status_entrega)}
										</Badge>
									</td>
									<td className="px-3 py-2.5 text-right font-bold tabular-nums">
										{money(p.valortotal)}
									</td>
									<td className="px-3 py-2.5 text-muted-foreground">
										<span className="inline-flex items-center gap-1 whitespace-nowrap">
											<Clock3 className="size-3.5" />
											{tempoAberto(p.abertoem)}
										</span>
									</td>
									<td className="px-3 py-2.5 text-right">
										<div className="flex justify-end gap-1">
											<Button
												size="sm"
												variant="outline"
												className="relative"
												disabled={!p.telefone}
												title={
													p.telefone
														? "Conversar no WhatsApp"
														: "Pedido sem telefone"
												}
												onClick={() => setChatConta(p)}
											>
												<MessageCircle className="size-4" />
												{(naoLidasMap[p.id] ?? 0) > 0 ? (
													<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
														{naoLidasMap[p.id]}
													</span>
												) : null}
											</Button>
											{p.status_entrega !== "entregue" ? (
												<Button
													size="sm"
													variant="outline"
													onClick={() => void avancarStatus(p.id)}
												>
													Avançar
												</Button>
											) : null}
											<Button
												size="sm"
												variant="destructive"
												disabled={loading || p.status_entrega === "entregue"}
												onClick={() => setCancelando(p)}
											>
												<XCircle className="size-4" />
												Cancelar
											</Button>
											<Button
												size="sm"
												className="min-w-20"
												onClick={() => navigate(`/delivery/${p.id}`)}
											>
												Abrir
											</Button>
										</div>
									</td>
								</tr>
							))}
							{!pedidos.length && !loading ? (
								<tr>
									<td
										colSpan={7}
										className="px-3 py-8 text-center text-muted-foreground"
									>
										Nenhum pedido aberto
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
			</div>
			{chatConta ? (
				<ChatWhatsappPedido
					aberto
					idconta={chatConta.id}
					telefone={chatConta.telefone}
					nomecliente={chatConta.nomecliente}
					onFechar={() => {
						setChatConta(null);
						void carregarNaoLidas();
					}}
				/>
			) : null}
		</PdvShell>
	);
}
