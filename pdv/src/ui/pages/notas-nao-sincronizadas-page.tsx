import dayjs from "dayjs";
import { AlertTriangle, FileWarning, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import { type StatusContext } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { secundarioDesconectado } from "@/ui/components/aviso-secundario";
import { FunctionBar } from "@/ui/components/function-bar";
import {
	OverlayProgressoPdv,
	type TipoOverlayProgressoPdv,
} from "@/ui/components/overlay-progresso-pdv";
import { PdvShell } from "@/ui/components/pdv-shell";
import { Topbar } from "@/ui/components/topbar";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/ui/components/ui/table";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";
import {
	badgeNfce,
	badgeSync,
	classeBadgeNfce,
	classeBadgeSync,
	contarCuponsNaoSincronizadosRetaguarda,
	rotuloNfce,
	rotuloNumeracaoNfce,
	rotuloOrigem,
	type VendaListagem,
} from "./vendas-colunas";

type ResultadoEnvioRetaguarda = {
	outboxProcessados: number;
	outboxErros: number;
	nfceAtualizadas: number;
	pendentes: number;
	totalVendas: number;
	vendasConfirmadas: number;
	restantes: number;
	primeiraFalha?: {
		idvenda?: string;
		idremoto?: string;
		mensagem: string;
	};
	detalhes: Array<{
		idvenda?: string;
		idremoto?: string;
		sucesso: boolean;
		mensagem: string;
	}>;
};

type ResultadoTransmitirPendentes = {
	outboxProcessados: number;
	outboxErros: number;
	outboxPendentes: number;
	nfceAtualizadas: number;
	total: number;
	sucesso: number;
	falhas: number;
};

function montarMensagemEnvio(result: ResultadoEnvioRetaguarda): string {
	const partes: string[] = [];
	if (result.totalVendas > 0) {
		partes.push(
			`vendas confirmadas ${result.vendasConfirmadas}/${result.totalVendas}`,
		);
		const ultima = [...result.detalhes]
			.reverse()
			.find((item) => item.sucesso && item.idvenda);
		if (ultima) {
			partes.push(
				`${ultima.idvenda} → remoto ${ultima.idremoto ?? "não informado"}`,
			);
		}
	}
	if (result.outboxProcessados > 0) {
		partes.push(
			`${result.outboxProcessados} item(ns) da fila enviado(s) à retaguarda`,
		);
	}
	if (result.nfceAtualizadas > 0) {
		partes.push(
			`${result.nfceAtualizadas} NFC-e atualizada(s) a partir da retaguarda`,
		);
	}
	if (result.outboxErros > 0) {
		partes.push(`${result.outboxErros} erro(s) na fila`);
	}
	if (result.pendentes > 0) {
		partes.push(`${result.pendentes} ainda pendente(s) na fila`);
	}
	if (result.primeiraFalha) {
		partes.push(
			`parado em ${result.primeiraFalha.idvenda ?? "venda"}: ${result.primeiraFalha.mensagem}`,
		);
	}
	if (!partes.length) {
		return "Nenhuma alteração — verifique a conexão ou se ainda há itens pendentes.";
	}
	return partes.join(" · ");
}

function montarMensagemTransmitirPendentes(
	result: ResultadoTransmitirPendentes,
): string {
	const partes: string[] = [];
	if (result.outboxProcessados > 0) {
		partes.push(
			`${result.outboxProcessados} item(ns) da fila enviado(s) à retaguarda`,
		);
	}
	if (result.total === 0) {
		partes.push("Nenhuma NFC-e pendente para transmitir");
	} else if (result.falhas === 0) {
		partes.push(`${result.sucesso} NFC-e transmitida(s) com sucesso`);
	} else if (result.sucesso === 0) {
		partes.push(`${result.falhas} falha(s) na transmissão`);
	} else {
		partes.push(
			`${result.sucesso} ok · ${result.falhas} falha(s) de ${result.total}`,
		);
	}
	if (result.outboxErros > 0) {
		partes.push(`${result.outboxErros} erro(s) na fila`);
	}
	if (result.outboxPendentes > 0) {
		partes.push(`${result.outboxPendentes} ainda na fila`);
	}
	return partes.join(" · ");
}

export function NotasNaoSincronizadasPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const { teclas } = useTeclasFuncao();
	const [vendas, setVendas] = useState<VendaListagem[]>([]);
	const [loading, setLoading] = useState(false);
	const [enviando, setEnviando] = useState(false);
	const [transmitindo, setTransmitindo] = useState(false);
	const [msg, setMsg] = useState("");
	const secundario = status?.modo === "secundario";

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setVendas(
				await pdvInvoke<VendaListagem[]>("listarVendasNaoSincronizadas"),
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	async function enviarParaRetaguarda() {
		setEnviando(true);
		setMsg("");
		try {
			const result = await pdvInvoke<ResultadoEnvioRetaguarda>(
				"enviarParaRetaguarda",
			);
			setMsg(montarMensagemEnvio(result));
			await load();
		} catch (err) {
			setMsg(
				err instanceof Error ? err.message : "Falha ao enviar à retaguarda",
			);
		} finally {
			setEnviando(false);
		}
	}

	async function transmitirTodasPendentes() {
		const qtdNaoSinc = contarCuponsNaoSincronizadosRetaguarda(vendas);
		if (qtdNaoSinc > 0) {
			setMsg(
				`Há ${qtdNaoSinc} cupom(ns) não sincronizado(s). Use “Enviar para retaguarda” antes de transmitir as pendentes.`,
			);
			return;
		}
		setTransmitindo(true);
		setMsg("");
		try {
			const result = await pdvInvoke<ResultadoTransmitirPendentes>(
				"transmitirTodasNfcePendentes",
			);
			setMsg(montarMensagemTransmitirPendentes(result));
			await load();
		} catch (err) {
			setMsg(
				err instanceof Error
					? err.message
					: "Falha ao transmitir NFC-e pendentes",
			);
		} finally {
			setTransmitindo(false);
		}
	}

	async function reemitirNovaNumeracao(vendaId: string) {
		const ok = window.confirm(
			"Reemitir esta NFC-e com NOVA numeração e reimprimir o DANFC-e? O cupom antigo fica como conflito de numeração.",
		);
		if (!ok) return;
		setTransmitindo(true);
		setMsg("");
		try {
			const result = await pdvInvoke<{ modo: string; mensagem: string }>(
				"reemitirContingenciaComNovaNumeracao",
				vendaId,
			);
			setMsg(
				result.modo === "erro"
					? `Erro ao reemitir: ${result.mensagem}`
					: result.mensagem,
			);
			await load();
		} catch (err) {
			setMsg(
				err instanceof Error
					? err.message
					: "Falha ao reemitir com nova numeração",
			);
		} finally {
			setTransmitindo(false);
		}
	}

	const ocupado = enviando || transmitindo || loading;
	const qtdCuponsNaoSincronizados =
		contarCuponsNaoSincronizadosRetaguarda(vendas);
	const bloqueiaTransmitir =
		ocupado ||
		secundario ||
		secundarioDesconectado(status) ||
		qtdCuponsNaoSincronizados > 0;

	const overlayProgresso: TipoOverlayProgressoPdv | null = transmitindo
		? "transmitir-pendentes"
		: enviando
			? "enviar-retaguarda"
			: null;

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			esconderAtalhoAlertasVendas
			topbar={
				<Topbar
					title="Notas não sincronizadas"
					subtitle="Vendas e NFC-e pendentes de envio à retaguarda"
					status={status}
					right={
						<Button
							variant="secondary"
							size="sm"
							onClick={() => navigate("/vendas")}
						>
							Voltar ao histórico
						</Button>
					}
				/>
			}
			footer={
				<>
					<OverlayProgressoPdv
						aberto={overlayProgresso != null}
						tipo={overlayProgresso ?? "transmitir-pendentes"}
					/>
					<FunctionBar
						actions={[
							{
								key: "transmitir-pendentes",
								label: transmitindo
									? "Transmitindo…"
									: "Transmitir todas pendentes",
								variant: "default",
								onClick: () => void transmitirTodasPendentes(),
								disabled: bloqueiaTransmitir,
							},
							{
								key: "enviar",
								label: enviando ? "Enviando…" : "Enviar para retaguarda",
								hotkey: teclas.sincronizar,
								variant: "secondary",
								onClick: () => void enviarParaRetaguarda(),
								disabled:
									ocupado || secundario || secundarioDesconectado(status),
							},
							{
								key: "atualizar",
								label: "Atualizar",
								variant: "secondary",
								onClick: () => void load(),
								disabled: ocupado,
							},
							{
								key: "voltar",
								label: "Voltar",
								hotkey: "Escape",
								variant: "outline",
								onClick: () => navigate("/vendas"),
							},
						]}
					/>
				</>
			}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border bg-card p-2 shadow-sm">
					<div className="flex min-w-0 items-center gap-2 px-1">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
							<FileWarning className="size-5" />
						</div>
						<div>
							<p className="text-sm font-semibold">
								{loading
									? "Carregando pendências…"
									: `${vendas.length} pendência${vendas.length === 1 ? "" : "s"} operacional${vendas.length === 1 ? "" : "is"}`}
							</p>
							<p className="text-xs text-muted-foreground">
								{qtdCuponsNaoSincronizados} aguardando retaguarda
							</p>
						</div>
					</div>
					<Button
						size="sm"
						variant="outline"
						className="ml-auto"
						disabled={ocupado}
						onClick={() => void load()}
					>
						<RefreshCw className={loading ? "animate-spin" : ""} />
						Atualizar
					</Button>
				</div>
				{secundario ? (
					<div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<p>
							No PDV secundário a sincronização com a retaguarda é feita no
							PDV principal. Abra o principal para enviar as notas pendentes.
						</p>
					</div>
				) : (
					<p className="rounded-md border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
						“Transmitir todas pendentes” processa a fila local e reenvia as
						NFC-e em contingência/pendentes à retaguarda e SEFAZ. Se houver
						cupom com sync pendente, o botão fica bloqueado — use antes “Enviar
						para retaguarda”. Cupons com “conflito numeração” não sobem
						automaticamente — use “Reemitir com nova numeração”.
					</p>
				)}
				{!secundario && qtdCuponsNaoSincronizados > 0 ? (
					<p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
						{qtdCuponsNaoSincronizados} cupom(ns) com sync pendente — envie para
						a retaguarda antes de transmitir as pendentes.
					</p>
				) : null}
				{msg ? (
					<p className="rounded-md bg-muted px-3 py-2 text-sm ring-1 ring-foreground/10">
						{msg}
					</p>
				) : null}
				<div className="pdv-surface min-h-0 flex-1 overflow-auto border shadow-sm">
					<Table className="text-xs">
						<TableHeader className="sticky top-0 z-10 bg-muted/95 uppercase tracking-wide text-muted-foreground backdrop-blur">
							<TableRow>
								<TableHead className="h-9 font-semibold">Data</TableHead>
								<TableHead className="h-9 font-semibold">Origem</TableHead>
								<TableHead className="h-9 text-right font-semibold">Total</TableHead>
								<TableHead className="h-9 font-semibold">Sync</TableHead>
								<TableHead className="h-9 font-semibold">Status NFC-e</TableHead>
								<TableHead className="h-9 font-semibold">Numeração</TableHead>
								<TableHead className="h-9 text-right font-semibold">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center text-sm">
										Carregando…
									</TableCell>
								</TableRow>
							) : vendas.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-center text-sm text-muted-foreground"
									>
										Nenhuma venda pendente de sincronização.
									</TableCell>
								</TableRow>
							) : (
								vendas.map((venda) => {
									const numeracao = rotuloNumeracaoNfce(venda);
									return (
									<TableRow key={venda.id} className="hover:bg-muted/40">
										<TableCell className="whitespace-nowrap py-1.5 text-xs">
											{dayjs(venda.criadoem).format("DD/MM/YY HH:mm")}
										</TableCell>
										<TableCell className="py-1.5 text-xs">
											{rotuloOrigem(venda.origem)}
										</TableCell>
										<TableCell className="py-1.5 text-right text-sm font-semibold tabular-nums">
											{money(venda.valortotal)}
										</TableCell>
										<TableCell className="py-1.5">
											<Badge
												variant={badgeSync(venda.sync_status)}
												className={classeBadgeSync(venda.sync_status)}
											>
												{venda.sync_status}
											</Badge>
										</TableCell>
										<TableCell className="py-1.5">
											<Badge
												variant={badgeNfce(venda.nfce_status)}
												className={classeBadgeNfce(venda.nfce_status)}
											>
												{rotuloNfce(venda.nfce_status)}
											</Badge>
											{venda.nfce_data_contingencia ? (
												<div className="mt-1 text-xs text-muted-foreground">
													dhCont{" "}
													{dayjs(venda.nfce_data_contingencia).format(
														"DD/MM/YY HH:mm:ss",
													)}
												</div>
											) : null}
											{(venda.nfce_ultimo_erro ||
												venda.outbox_ultimo_erro) ? (
												<div
													className="mt-1 max-w-72 truncate text-xs text-destructive"
													title={
														venda.nfce_ultimo_erro ??
														venda.outbox_ultimo_erro ??
														""
													}
												>
													{venda.nfce_ultimo_erro ??
														venda.outbox_ultimo_erro}
												</div>
											) : null}
										</TableCell>
										<TableCell className="py-1.5">
											{numeracao ? (
												<span className="font-mono text-sm tabular-nums">
													{numeracao}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">—</span>
											)}
											{venda.outbox_tentativas ? (
												<div className="text-xs text-muted-foreground">
													{venda.outbox_tentativas} tentativa(s)
												</div>
											) : null}
										</TableCell>
										<TableCell className="py-1.5 text-right">
											{venda.nfce_status === "conflito_numeracao" &&
											!secundario ? (
												<Button
													size="sm"
													variant="outline"
													disabled={ocupado}
													onClick={() =>
														void reemitirNovaNumeracao(venda.id)
													}
												>
													Nova numeração
												</Button>
											) : null}
										</TableCell>
									</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PdvShell>
	);
}
