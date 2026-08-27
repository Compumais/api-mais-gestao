import { Bike, Package, Phone, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import type { StatusContext } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { AvisoSecundario } from "@/ui/components/aviso-secundario";
import { FunctionBar } from "@/ui/components/function-bar";
import { Topbar } from "@/ui/components/topbar";
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

	useEscapeFechaModal(abrir, () => setAbrir(false));

	async function carregar() {
		setLoading(true);
		setMsg("");
		try {
			const data = await pdvInvoke<ContaEntrega[]>(
				"listarPedidosEntrega",
				filtro || null,
			);
			setPedidos(data);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao listar delivery");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void carregar();
	}, [filtro]);

	async function buscarClientes(termo: string) {
		try {
			setClientes(await pdvInvoke<ClientePdv[]>("buscarClientesPdv", termo, 20));
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

	const titulo = useMemo(
		() =>
			status?.sessao.nomeempresa
				? `Delivery — ${status.sessao.nomeempresa}`
				: "Delivery",
		[status?.sessao.nomeempresa],
	);

	return (
		<div className="flex h-full flex-col gap-3 p-4">
			<Topbar
				title={titulo}
				subtitle="Pedidos de entrega e retirada"
			/>
			<AvisoSecundario status={status} />
			{msg ? (
				<p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{msg}
				</p>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant={filtro === "" ? "default" : "outline"}
					onClick={() => setFiltro("")}
				>
					Todos
				</Button>
				{["recebido", "producao", "saiu"].map((s) => (
					<Button
						key={s}
						variant={filtro === s ? "default" : "outline"}
						onClick={() => setFiltro(s)}
					>
						{rotuloStatus(s)}
					</Button>
				))}
				<div className="ml-auto">
					<Button onClick={() => setAbrir(true)}>
						<Plus className="mr-1 size-4" />
						Novo pedido
					</Button>
				</div>
			</div>

			<div className="pdv-surface min-h-0 flex-1 overflow-auto">
				<table className="w-full text-sm">
					<thead className="sticky top-0 bg-muted/80 text-left">
						<tr>
							<th className="px-3 py-2">Senha</th>
							<th className="px-3 py-2">Cliente</th>
							<th className="px-3 py-2">Tipo</th>
							<th className="px-3 py-2">Status</th>
							<th className="px-3 py-2">Total</th>
							<th className="px-3 py-2">Tempo</th>
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody>
						{pedidos.map((p) => (
							<tr
								key={p.id}
								className="border-t border-border hover:bg-muted/40"
							>
								<td className="px-3 py-2 font-mono font-semibold">
									#{p.senha_chamada ?? "—"}
								</td>
								<td className="px-3 py-2">
									<div className="font-medium">{p.nomecliente || "Sem nome"}</div>
									{p.telefone ? (
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Phone className="size-3" />
											{p.telefone}
										</div>
									) : null}
									{p.modalidade === "delivery" && p.endereco ? (
										<div className="text-xs text-muted-foreground">
											{p.endereco}
											{p.bairro ? ` — ${p.bairro}` : ""}
										</div>
									) : null}
								</td>
								<td className="px-3 py-2">
									<span className="inline-flex items-center gap-1">
										{p.modalidade === "delivery" ? (
											<Bike className="size-3.5" />
										) : (
											<Package className="size-3.5" />
										)}
										{p.modalidade === "delivery" ? "Delivery" : "Retirada"}
									</span>
								</td>
								<td className="px-3 py-2">{rotuloStatus(p.status_entrega)}</td>
								<td className="px-3 py-2 font-semibold">
									{money(p.valortotal)}
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									{tempoAberto(p.abertoem)}
								</td>
								<td className="px-3 py-2 text-right">
									<div className="flex justify-end gap-1">
										<Button
											size="sm"
											variant="outline"
											onClick={() => void avancarStatus(p.id)}
										>
											Avançar
										</Button>
										<Button
											size="sm"
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
						key: "voltar",
						label: "Voltar",
						hotkey: "Esc",
						variant: "outline",
						onClick: () => navigate("/"),
					},
				]}
			/>

			{abrir ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
								<Input value={nome} onChange={(e) => setNome(e.target.value)} />
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
							<Button disabled={loading} onClick={() => void confirmarAbrir()}>
								Abrir pedido
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
