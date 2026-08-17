import {
	Circle,
	Clock3,
	Receipt,
	Settings,
	ShoppingCart,
	UtensilsCrossed,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type MesaConsulta,
	type MesaResumo,
	rotuloModelo,
	type StatusAtividadeMesa,
	type StatusContext,
} from "@/lib/pdv-types";
import { centavosToNumber, cn, money } from "@/lib/utils";
import {
	AvisoSecundario,
	secundarioDesconectado,
} from "@/ui/components/aviso-secundario";
import { FunctionBar } from "@/ui/components/function-bar";
import { NumericKeypad } from "@/ui/components/numeric-keypad";
import { StatusBar } from "@/ui/components/status-bar";
import { Topbar } from "@/ui/components/topbar";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";
import { BalcaoPage } from "@/ui/pages/balcao-page";

type DialogoAbertura =
	| null
	| { tipo: "nome"; numero: number }
	| {
			tipo: "continuar";
			numero: number;
			nomecliente: string | null;
			valortotal: number;
	  };

function SideButton({
	label,
	icon: Icon,
	onClick,
	active,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	onClick: () => void;
	active?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 py-4 text-sm font-semibold transition",
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-card hover:border-primary",
			)}
		>
			<Icon className="size-7" />
			{label}
		</button>
	);
}

function iconeStatus(status: StatusAtividadeMesa) {
	if (status === "consumindo") return UtensilsCrossed;
	if (status === "ociosa") return Clock3;
	return Circle;
}

function rotuloStatus(status: StatusAtividadeMesa) {
	if (status === "consumindo") return "Consumindo";
	if (status === "ociosa") return "Ociosa";
	return "Livre";
}

function classeMesa(status: StatusAtividadeMesa) {
	if (status === "consumindo") {
		return "border-primary bg-primary text-primary-foreground";
	}
	if (status === "ociosa") {
		return "border-accent bg-accent text-accent-foreground";
	}
	return "border-border bg-card text-muted-foreground";
}

/** Home: mesas se a empresa tem Gourmet; senão, só o balcão. */
export function HomeEntry() {
	const ctx = useOutletContext<StatusContext>();
	if (!ctx.status) return null;
	if (!ctx.status.moduloGourmet) {
		return <BalcaoPage />;
	}
	return <HomePage />;
}

export function HomePage() {
	const { status, refresh } = useOutletContext<StatusContext>();
	const navigate = useNavigate();
	const [mesas, setMesas] = useState<MesaResumo[]>([]);
	const [totalHoje, setTotalHoje] = useState(0);
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [fechando, setFechando] = useState(false);
	const [digitosFechamento, setDigitosFechamento] = useState("0");
	const [apenasAbertas, setApenasAbertas] = useState(false);
	const [novaNumero, setNovaNumero] = useState("");
	const [dialogo, setDialogo] = useState<DialogoAbertura>(null);
	const [nomeCliente, setNomeCliente] = useState("");

	useEscapeFechaModal(fechando, () => setFechando(false));
	useEscapeFechaModal(dialogo !== null, () => {
		setDialogo(null);
		setNomeCliente("");
	});

	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const bloqueado = secundarioDesconectado(status);

	async function carregarMesas() {
		setMesas(await pdvInvoke<MesaResumo[]>("listarMesas"));
	}

	async function carregarPreferencias() {
		const config = await pdvInvoke<Record<string, string>>("getConfig");
		setApenasAbertas(config.filtro_apenas_abertas === "1");
	}

	async function carregarTotalHoje() {
		const vendas =
			await pdvInvoke<Array<{ valortotal: number; criadoem: string }>>(
				"listarVendas",
			);
		const hoje = new Date().toDateString();
		const total = vendas
			.filter((v) => new Date(v.criadoem).toDateString() === hoje)
			.reduce((acc, v) => acc + v.valortotal, 0);
		setTotalHoje(total);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: deve rodar apenas uma vez ao montar
	useEffect(() => {
		void carregarPreferencias();
		void carregarMesas();
		void carregarTotalHoje();
		const id = setInterval(() => {
			void carregarMesas();
			void carregarTotalHoje();
		}, 10000);
		return () => clearInterval(id);
	}, []);

	const mesasVisiveis = useMemo(
		() => (apenasAbertas ? mesas.filter((m) => m.status === "ocupada") : mesas),
		[apenasAbertas, mesas],
	);

	const livres = mesas.filter((m) => m.status === "livre").length;
	const ocupadas = mesas.length - livres;
	const consumindo = mesas.filter(
		(m) => m.statusAtividade === "consumindo",
	).length;
	const ociosas = mesas.filter((m) => m.statusAtividade === "ociosa").length;

	async function alternarFiltroAbertas(marcado: boolean) {
		setApenasAbertas(marcado);
		try {
			await pdvInvoke("saveConfig", {
				filtro_apenas_abertas: marcado ? "1" : "0",
			});
		} catch {
			// Preferência visual: se falhar o save, mantém o estado local.
		}
	}

	function irParaConta(numero: number, nome?: string | null) {
		setDialogo(null);
		setNomeCliente("");
		setNovaNumero("");
		navigate(`/mesas/${numero}`, {
			state: { nomecliente: nome?.trim() ? nome.trim() : null },
		});
	}

	function solicitarAbertura(mesa: {
		numero: number;
		status: string;
		nomecliente: string | null;
		valortotal: number;
	}) {
		if (bloqueado) {
			setMsg(
				status?.principalErro ?? "PDV principal offline. Operação bloqueada.",
			);
			return;
		}
		if (mesa.status === "ocupada") {
			setDialogo({
				tipo: "continuar",
				numero: mesa.numero,
				nomecliente: mesa.nomecliente,
				valortotal: mesa.valortotal,
			});
			return;
		}
		setNomeCliente("");
		setDialogo({ tipo: "nome", numero: mesa.numero });
	}

	async function abrirNova() {
		if (bloqueado) {
			setMsg(
				status?.principalErro ?? "PDV principal offline. Operação bloqueada.",
			);
			return;
		}
		const numero = Number(novaNumero);
		if (!Number.isInteger(numero) || numero < 1) {
			setMsg(`Informe um número válido de ${rotulo.singular.toLowerCase()}.`);
			return;
		}
		setLoading(true);
		setMsg("");
		try {
			const mesa = await pdvInvoke<MesaConsulta>("obterMesa", numero);
			solicitarAbertura(mesa);
		} catch (err) {
			setMsg(
				err instanceof Error
					? err.message
					: `Erro ao abrir ${rotulo.singular.toLowerCase()}`,
			);
		} finally {
			setLoading(false);
		}
	}

	async function sincronizar() {
		setLoading(true);
		setMsg("");
		try {
			const result = await pdvInvoke<{
				pull: { produtos: number; grupos: number; atalhos: number };
				pendentes: number;
			}>("syncAgora");
			await refresh();
			await carregarMesas();
			setMsg(
				`Sincronizado: ${result.pull.produtos} produtos · ${result.pull.grupos} grupos · fila ${result.pendentes}`,
			);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao sincronizar");
		} finally {
			setLoading(false);
		}
	}

	async function confirmarFechamento() {
		setLoading(true);
		try {
			await pdvInvoke("fecharCaixa", centavosToNumber(digitosFechamento));
			await refresh();
			setFechando(false);
			setDigitosFechamento("0");
			navigate("/abertura-caixa", { replace: true });
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Erro ao fechar caixa");
		} finally {
			setLoading(false);
		}
	}

	async function sair() {
		await pdvInvoke("logout");
		marcarBootPendente();
		navigate("/login", { replace: true });
	}

	return (
		<div className="flex h-screen flex-col">
			<Topbar
				title={rotulo.plural}
				subtitle={status?.sessao.nomeempresa ?? ""}
				right={
					<Badge variant={status?.online ? "success" : "warning"}>
						{status?.online ? "Online" : "Offline"}
					</Badge>
				}
			/>

			<div className="flex flex-1 gap-3 overflow-hidden p-3">
				<div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-lg border bg-card p-3">
					<div className="flex flex-wrap items-end gap-3">
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								className="size-4 accent-primary"
								checked={apenasAbertas}
								onChange={(e) => void alternarFiltroAbertas(e.target.checked)}
							/>
							Exibir apenas {rotulo.plural.toLowerCase()} abertas
						</label>

						<div className="ml-auto flex items-end gap-2">
							<div className="space-y-1">
								<label
									htmlFor="nova-comanda"
									className="text-xs text-muted-foreground"
								>
									Abrir {rotulo.singular.toLowerCase()} nº
								</label>
								<Input
									id="nova-comanda"
									type="number"
									min={1}
									className="h-9 w-28"
									value={novaNumero}
									onChange={(e) => setNovaNumero(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") void abrirNova();
									}}
									placeholder="Ex: 12"
								/>
							</div>
							<Button
								size="sm"
								disabled={loading || bloqueado || !novaNumero}
								onClick={() => void abrirNova()}
							>
								Abrir
							</Button>
						</div>
					</div>

					<AvisoSecundario status={status} />
					{msg && <p className="text-sm text-muted-foreground">{msg}</p>}

					<div className="mb-1 flex flex-wrap gap-3 text-xs">
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
								classeMesa("livre"),
							)}
						>
							<Circle className="size-3.5" /> Livre
						</span>
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
								classeMesa("consumindo"),
							)}
						>
							<UtensilsCrossed className="size-3.5" /> Consumindo
						</span>
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
								classeMesa("ociosa"),
							)}
						>
							<Clock3 className="size-3.5" /> Ociosa
						</span>
					</div>

					<div className="grid flex-1 auto-rows-min grid-cols-4 gap-3 overflow-auto sm:grid-cols-5 xl:grid-cols-6">
						{mesasVisiveis.map((mesa) => {
							const Icon = iconeStatus(mesa.statusAtividade);
							return (
								<button
									key={mesa.numero}
									type="button"
									onClick={() => solicitarAbertura(mesa)}
									className={cn(
										"flex h-28 flex-col items-center justify-center gap-1 rounded-lg border-2 text-center transition hover:brightness-110",
										classeMesa(mesa.statusAtividade),
									)}
								>
									<Icon className="size-5" />
									<span className="text-lg font-bold">{mesa.numero}</span>
									<span className="text-[11px]">
										{mesa.status === "ocupada"
											? mesa.nomecliente || rotuloStatus(mesa.statusAtividade)
											: "Livre"}
									</span>
									{mesa.status === "ocupada" && (
										<span className="text-xs font-semibold">
											{money(mesa.valortotal)}
										</span>
									)}
								</button>
							);
						})}
						{mesasVisiveis.length === 0 && (
							<p className="col-span-full text-sm text-muted-foreground">
								{apenasAbertas
									? `Nenhuma ${rotulo.singular.toLowerCase()} aberta. Use o campo acima para abrir uma nova.`
									: `Nenhuma ${rotulo.singular.toLowerCase()} configurada. Ajuste a quantidade em Configurações.`}
							</p>
						)}
					</div>
				</div>

				<aside className="flex w-48 flex-col gap-2">
					<SideButton
						label={rotulo.plural}
						icon={UtensilsCrossed}
						active
						onClick={() => void carregarMesas()}
					/>
					<SideButton
						label="Balcão"
						icon={ShoppingCart}
						onClick={() => {
							if (bloqueado) {
								setMsg(
									status?.principalErro ??
										"PDV principal offline. Operação bloqueada.",
								);
								return;
							}
							navigate("/balcao");
						}}
					/>
					<SideButton
						label="Vendas"
						icon={Receipt}
						onClick={() => navigate("/vendas")}
					/>
					{status?.podeConfigurar ? (
						<SideButton
							label="Config"
							icon={Settings}
							onClick={() => navigate("/config")}
						/>
					) : null}
				</aside>
			</div>

			{dialogo?.tipo === "nome" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-96 space-y-4 rounded-lg border bg-card p-5">
						<h2 className="text-lg font-semibold">
							Abrir {rotulo.singular.toLowerCase()} {dialogo.numero}
						</h2>
						<p className="text-sm text-muted-foreground">
							Informe o nome do cliente (opcional) para identificação.
						</p>
						<Input
							placeholder="Nome do cliente"
							value={nomeCliente}
							onChange={(e) => setNomeCliente(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									irParaConta(dialogo.numero, nomeCliente);
								}
							}}
						/>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => {
									setDialogo(null);
									setNomeCliente("");
								}}
							>
								Cancelar
							</Button>
							<Button
								className="flex-1"
								onClick={() => irParaConta(dialogo.numero, nomeCliente)}
							>
								Continuar
							</Button>
						</div>
					</div>
				</div>
			)}

			{dialogo?.tipo === "continuar" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-96 space-y-4 rounded-lg border bg-card p-5">
						<h2 className="text-lg font-semibold">
							{rotulo.singular} {dialogo.numero} já está aberta
						</h2>
						<p className="text-sm text-muted-foreground">
							{dialogo.nomecliente ? `Cliente: ${dialogo.nomecliente}. ` : ""}
							Total atual: {money(dialogo.valortotal)}. Deseja continuar nesta
							conta?
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => setDialogo(null)}
							>
								Não
							</Button>
							<Button
								className="flex-1"
								onClick={() => irParaConta(dialogo.numero)}
							>
								Sim, continuar
							</Button>
						</div>
					</div>
				</div>
			)}

			{fechando && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="w-80 space-y-3 rounded-lg border bg-card p-4">
						<h2 className="text-lg font-semibold">Fechamento de caixa</h2>
						<div className="text-center text-2xl font-bold text-primary">
							{money(centavosToNumber(digitosFechamento))}
						</div>
						<NumericKeypad
							digits={digitosFechamento}
							onChange={setDigitosFechamento}
							disabled={loading}
							capturarSobreInput
							onEnter={() => {
								if (!loading) void confirmarFechamento();
							}}
						/>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								disabled={loading}
								onClick={() => setFechando(false)}
							>
								Cancelar
							</Button>
							<Button
								className="flex-1"
								disabled={loading}
								onClick={() => void confirmarFechamento()}
							>
								Confirmar
							</Button>
						</div>
					</div>
				</div>
			)}

			<StatusBar
				items={[
					{
						label: "Conexão",
						value: status?.online ? "Online" : "Offline",
						tone: status?.online ? "success" : "warning",
					},
					...(status?.modo === "secundario"
						? [
								{
									label: "Principal",
									value: status.principalOnline ? "Online" : "Offline",
									tone: status.principalOnline
										? ("success" as const)
										: ("destructive" as const),
								},
							]
						: []),
					{ label: "Fila", value: status?.outboxPendentes ?? 0 },
					{ label: "Livres", value: livres, tone: "success" },
					{
						label: "Consumindo",
						value: consumindo,
						tone: consumindo ? "success" : "default",
					},
					{
						label: "Ociosas",
						value: ociosas,
						tone: ociosas ? "warning" : "default",
					},
					{ label: "Ocupadas", value: ocupadas },
					{ label: "Total hoje", value: money(totalHoje) },
				]}
			/>
			<FunctionBar
				actions={[
					{
						key: "sync",
						label: "Sincronizar",
						hotkey: "F5",
						variant: "secondary",
						onClick: () => void sincronizar(),
						disabled: loading,
					},
					{
						key: "balcao",
						label: "Balcão",
						hotkey: "F2",
						variant: "default",
						onClick: () => navigate("/balcao"),
						disabled: bloqueado,
					},
					{
						key: "vendas",
						label: "Vendas",
						hotkey: "F3",
						variant: "secondary",
						onClick: () => navigate("/vendas"),
					},
					...(status?.podeConfigurar
						? [
								{
									key: "config",
									label: "Config",
									hotkey: "F4",
									variant: "outline" as const,
									onClick: () => navigate("/config"),
								},
							]
						: []),
					{
						key: "fechar-caixa",
						label: "Fechar caixa",
						hotkey: "F9",
						variant: "destructive",
						onClick: () => setFechando(true),
					},
					{
						key: "sair",
						label: "Sair",
						hotkey: "F12",
						variant: "outline",
						onClick: () => void sair(),
					},
				]}
			/>
		</div>
	);
}
