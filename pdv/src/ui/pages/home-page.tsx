import {
	Circle,
	Clock3,
	LayoutGrid,
	Plus,
	Search,
	UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { LeituraComandaNormalizada } from "@/lib/comanda-scanner";
import { marcarBootPendente } from "@/lib/boot-state";
import { pdvInvoke } from "@/lib/pdv-api";
import {
	type MesaConsulta,
	type MesaResumo,
	rotuloModelo,
	type StatusAtividadeMesa,
	type StatusContext,
} from "@/lib/pdv-types";
import { cn, money } from "@/lib/utils";
import {
	AvisoSecundario,
	secundarioDesconectado,
} from "@/ui/components/aviso-secundario";
import { AlertasOperacionaisPdv } from "@/ui/components/alertas-operacionais-pdv";
import { DialogFecharCaixa } from "@/ui/components/dialog-fechar-caixa";
import { FunctionBar } from "@/ui/components/function-bar";
import { SideNav } from "@/ui/components/side-nav";
import { StatusBar } from "@/ui/components/status-bar";
import { Topbar } from "@/ui/components/topbar";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";
import { useLeitorComanda } from "@/ui/hooks/use-leitor-comanda";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";
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

type FiltroMesa = "todos" | StatusAtividadeMesa;

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
		return "bg-primary text-primary-foreground ring-primary";
	}
	if (status === "ociosa") {
		return "bg-accent text-accent-foreground ring-foreground/15";
	}
	return "bg-card text-muted-foreground ring-foreground/10";
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
	const { teclas } = useTeclasFuncao();
	const [mesas, setMesas] = useState<MesaResumo[]>([]);
	const [totalHoje, setTotalHoje] = useState(0);
	const [msg, setMsg] = useState("");
	const [loading, setLoading] = useState(false);
	const [fechando, setFechando] = useState(false);
	const [filtro, setFiltro] = useState<FiltroMesa>("todos");
	const [apenasAbertas, setApenasAbertas] = useState(false);
	const [novaNumero, setNovaNumero] = useState("");
	const [dialogo, setDialogo] = useState<DialogoAbertura>(null);
	const [nomeCliente, setNomeCliente] = useState("");
	const [modalAbrirMesaHabilitado, setModalAbrirMesaHabilitado] =
		useState(true);

	useEscapeFechaModal(dialogo !== null, () => {
		setDialogo(null);
		setNomeCliente("");
	});

	const rotulo = rotuloModelo(status?.modeloAtendimento);
	const bloqueado = secundarioDesconectado(status);

	useLeitorComanda({
		ativo:
			status?.modeloAtendimento === "comanda" &&
			!bloqueado &&
			!loading &&
			dialogo === null,
		onLeitura: abrirComandaLida,
	});

	async function carregarMesas() {
		setMesas(await pdvInvoke<MesaResumo[]>("listarMesas"));
	}

	async function carregarPreferencias() {
		const config = await pdvInvoke<Record<string, string>>("getConfig");
		setApenasAbertas(config.filtro_apenas_abertas === "1");
		setModalAbrirMesaHabilitado(config.modal_abrir_mesa_habilitado !== "0");
	}

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
		() => {
			const termo = novaNumero.trim().toLocaleLowerCase("pt-BR");
			return mesas.filter((mesa) => {
				if (apenasAbertas && mesa.status !== "ocupada") return false;
				if (filtro !== "todos" && mesa.statusAtividade !== filtro) return false;
				if (!termo) return true;
				return (
					String(mesa.numero).includes(termo) ||
					mesa.nomecliente?.toLocaleLowerCase("pt-BR").includes(termo)
				);
			});
		},
		[apenasAbertas, filtro, mesas, novaNumero],
	);

	const livres = mesas.filter((m) => m.status === "livre").length;
	const ocupadas = mesas.length - livres;
	const consumindo = mesas.filter(
		(m) => m.statusAtividade === "consumindo",
	).length;
	const ociosas = mesas.filter((m) => m.statusAtividade === "ociosa").length;
	const numeroInformado = Number(novaNumero);
	const podeAbrirNumero =
		Number.isInteger(numeroInformado) && numeroInformado >= 1;

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
		if (!modalAbrirMesaHabilitado) {
			irParaConta(mesa.numero);
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

	async function abrirComandaLida(leitura: LeituraComandaNormalizada) {
		const numero = Number(leitura.codigoConsulta);
		if (!Number.isSafeInteger(numero) || numero < 1) {
			setMsg(
				`Código de comanda inválido: "${leitura.codigoOriginal}". Tente realizar a leitura novamente.`,
			);
			return;
		}

		setLoading(true);
		setMsg("");
		try {
			// Somente o código sem DV consulta a mesa. O original permanece intacto
			// em `leitura.codigoOriginal` e não é substituído no fluxo da catraca.
			const mesa = await pdvInvoke<MesaConsulta>("obterMesa", numero);
			solicitarAbertura(mesa);
		} catch (err) {
			const detalhe =
				err instanceof Error ? err.message : "Comanda não encontrada";
			setMsg(
				`Não foi possível abrir a comanda lida "${leitura.codigoOriginal}" (consulta ${leitura.codigoConsulta}). ${detalhe}`,
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
				outbox: {
					totalVendas: number;
					vendasConfirmadas: number;
					restantes: number;
					primeiraFalha?: { idvenda?: string; mensagem: string };
				};
			}>("syncAgora");
			await refresh();
			await carregarMesas();
			const vendas =
				result.outbox.totalVendas > 0
					? ` · vendas ${result.outbox.vendasConfirmadas}/${result.outbox.totalVendas} confirmadas`
					: "";
			const falha = result.outbox.primeiraFalha
				? ` · primeira falha: ${result.outbox.primeiraFalha.idvenda ?? "venda"} — ${result.outbox.primeiraFalha.mensagem}`
				: "";
			setMsg(
				`Catálogo: ${result.pull.produtos} produtos · ${result.pull.grupos} grupos${vendas} · fila ${result.pendentes}${falha}`,
			);
		} catch (err) {
			setMsg(err instanceof Error ? err.message : "Falha ao sincronizar");
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
				status={status}
				onExit={() => void sair()}
				center={
					<div className="mx-auto flex max-w-xl items-center rounded-xl border border-white/15 bg-white/10 px-3 text-white shadow-inner">
						<Search className="size-4 shrink-0 opacity-70" />
						<input
							type="text"
							inputMode="search"
							className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-white/55"
							value={novaNumero}
							onChange={(e) => setNovaNumero(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && podeAbrirNumero) void abrirNova();
							}}
							placeholder={`Buscar ou abrir ${rotulo.singular.toLowerCase()}...`}
						/>
						{podeAbrirNumero ? (
							<button
								type="button"
								className="rounded-md bg-white/12 px-2 py-1 text-[10px] font-semibold hover:bg-white/20"
								onClick={() => void abrirNova()}
								disabled={loading || bloqueado}
							>
								Enter para abrir
							</button>
						) : null}
					</div>
				}
			/>

			<div className="flex min-h-0 flex-1 overflow-hidden bg-muted/35">
				<SideNav
					status={status}
					onBlocked={setMsg}
					onMesasActiveClick={() => void carregarMesas()}
				/>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5">
					<div className="pdv-surface flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3">
					<div className="flex flex-wrap items-center gap-2">
						{(
							[
								["todos", "Todas", LayoutGrid, mesas.length],
								["livre", "Livres", Circle, livres],
								["consumindo", "Consumindo", UtensilsCrossed, consumindo],
								["ociosa", "Ociosas", Clock3, ociosas],
							] as const
						).map(([valor, label, Icon, quantidade]) => (
							<Button
								key={valor}
								size="sm"
								variant={filtro === valor ? "default" : "outline"}
								className="gap-2"
								onClick={() => setFiltro(valor)}
							>
								<Icon className="size-4" />
								{label}
								<span className="rounded-full bg-black/10 px-1.5 text-[10px]">
									{quantidade}
								</span>
							</Button>
						))}
						<label className="ml-1 flex min-h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted">
							<input
								type="checkbox"
								className="size-4 accent-primary"
								checked={apenasAbertas}
								onChange={(e) => void alternarFiltroAbertas(e.target.checked)}
							/>
							Apenas abertas
						</label>
						<Button
							size="sm"
							className="ml-auto gap-2"
							disabled={loading || bloqueado || !podeAbrirNumero}
							onClick={() => void abrirNova()}
						>
							<Plus className="size-4" />
							Abrir {rotulo.singular.toLowerCase()}
						</Button>
					</div>

					<AvisoSecundario status={status} />
					<AlertasOperacionaisPdv status={status} />
					{msg && <p className="text-sm text-muted-foreground">{msg}</p>}

					<div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3 overflow-auto p-0.5">
						{mesasVisiveis.map((mesa) => {
							const Icon = iconeStatus(mesa.statusAtividade);
							return (
								<button
									key={mesa.numero}
									type="button"
									onClick={() => solicitarAbertura(mesa)}
									className={cn(
										"group relative flex h-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl text-center ring-1 transition hover:-translate-y-0.5 hover:shadow-md hover:brightness-105",
										classeMesa(mesa.statusAtividade),
									)}
								>
									<Icon className="size-5 opacity-80" />
									<span className="text-xl font-bold tabular-nums">
										{String(mesa.numero).padStart(2, "0")}
									</span>
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
									? `Nenhuma ${rotulo.singular.toLowerCase()} aberta neste filtro.`
									: `Nenhuma ${rotulo.singular.toLowerCase()} encontrada neste filtro.`}
							</p>
						)}
					</div>
					</div>
				</div>
			</div>

			{dialogo?.tipo === "nome" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
					<div className="pdv-surface w-96 space-y-4 p-5">
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
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
					<div className="pdv-surface w-96 space-y-4 p-5">
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

			<DialogFecharCaixa
				aberto={fechando}
				onFechar={() => setFechando(false)}
				onSucesso={async () => {
					// Tenta subir a fila com o token atual antes de deslogar.
					try {
						await Promise.race([
							pdvInvoke("processarOutboxAgora"),
							new Promise((resolve) => setTimeout(resolve, 8000)),
						]);
					} catch {
						// Sync best-effort; logout segue mesmo se a fila falhar.
					}
					await sair();
				}}
			/>

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
					{
						label: "NFC-e pendentes",
						value: status?.nfcePendentesTransmissao ?? 0,
						tone:
							(status?.nfcePendentesTransmissao ?? 0) > 0
								? ("warning" as const)
								: ("default" as const),
					},
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
						hotkey: teclas.sincronizar,
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
						key: "delivery",
						label: "Delivery",
						hotkey: "F6",
						variant: "default",
						onClick: () => navigate("/delivery"),
						disabled: bloqueado,
					},
					{
						key: "pedidos",
						label: "Pedidos",
						hotkey: "F7",
						variant: "secondary",
						onClick: () => navigate("/pedidos"),
					},
					{
						key: "vendas",
						label: "Vendas",
						hotkey: teclas.historico,
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
						hotkey: teclas.fechar_caixa,
						variant: "destructive",
						onClick: () => setFechando(true),
					},
					{
						key: "sair",
						label: "Sair",
						hotkey: teclas.sair,
						variant: "outline",
						onClick: () => void sair(),
					},
				]}
			/>
		</div>
	);
}
