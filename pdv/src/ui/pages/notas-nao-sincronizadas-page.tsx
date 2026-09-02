import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pdvInvoke } from "@/lib/pdv-api";
import { type StatusContext } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { secundarioDesconectado } from "@/ui/components/aviso-secundario";
import { FunctionBar } from "@/ui/components/function-bar";
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

	const ocupado = enviando || transmitindo || loading;

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			topbar={
				<Topbar
					title="Notas não sincronizadas"
					subtitle="Vendas e NFC-e pendentes de envio à retaguarda"
					right={
						<Button
							variant="secondary"
							size="sm"
							onClick={() => navigate("/vendas")}
						>
							Voltar às vendas
						</Button>
					}
				/>
			}
			footer={
				<FunctionBar
					actions={[
						{
							key: "transmitir-pendentes",
							label: transmitindo
								? "Transmitindo…"
								: "Transmitir todas pendentes",
							variant: "default",
							onClick: () => void transmitirTodasPendentes(),
							disabled:
								ocupado || secundario || secundarioDesconectado(status),
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
			}
		>
			<div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
				{secundario ? (
					<p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
						No PDV secundário a sincronização com a retaguarda é feita no PDV
						principal. Abra o principal para enviar as notas pendentes.
					</p>
				) : (
					<p className="text-sm text-muted-foreground">
						“Transmitir todas pendentes” processa a fila local e reenvia as
						NFC-e em contingência/pendentes à retaguarda e SEFAZ. “Enviar para
						retaguarda” só sincroniza a fila sem forçar retransmissão.
					</p>
				)}
				{msg ? (
					<p className="rounded-md bg-muted px-3 py-2 text-sm ring-1 ring-foreground/10">
						{msg}
					</p>
				) : null}
				<div className="min-h-0 flex-1 overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Data</TableHead>
								<TableHead>Origem</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead>Sync</TableHead>
								<TableHead>NFC-e</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={5} className="text-center text-sm">
										Carregando…
									</TableCell>
								</TableRow>
							) : vendas.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className="text-center text-sm text-muted-foreground"
									>
										Nenhuma venda pendente de sincronização.
									</TableCell>
								</TableRow>
							) : (
								vendas.map((venda) => {
									const numeracao = rotuloNumeracaoNfce(venda);
									return (
									<TableRow key={venda.id}>
										<TableCell className="whitespace-nowrap text-sm">
											{dayjs(venda.criadoem).format("DD/MM/YY HH:mm")}
										</TableCell>
										<TableCell className="text-sm">
											{rotuloOrigem(venda.origem)}
										</TableCell>
										<TableCell className="text-right text-sm">
											{money(venda.valortotal)}
										</TableCell>
										<TableCell>
											<Badge variant={badgeSync(venda.sync_status)}>
												{venda.sync_status}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex flex-col items-start gap-0.5">
												<Badge variant={badgeNfce(venda.nfce_status)}>
													{rotuloNfce(venda.nfce_status)}
												</Badge>
												{numeracao ? (
													<span className="font-mono text-xs tabular-nums text-muted-foreground">
														{numeracao}
													</span>
												) : null}
											</div>
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
