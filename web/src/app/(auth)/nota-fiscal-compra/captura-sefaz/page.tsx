"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	DownloadIcon,
	FileInputIcon,
	RefreshCwIcon,
	ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	baixarXmlNfeInbound,
	importarDocumentoNfeInbound,
	listarDocumentosNfeInbound,
	manifestarCienciaNfeInbound,
	type NfeInboundDocumento,
	obterStatusSyncNfeInbound,
	sincronizarNfeInbound,
} from "@/services/nfe-inbound.service";
import { PageContainer } from "../../components/page-container";

const LABEL_STATUS_IMPORTACAO: Record<string, string> = {
	aguardando_xml: "Aguardando XML",
	disponivel: "Disponível",
	rascunho_criado: "Rascunho criado",
	importado: "Importado",
	ignorado: "Ignorado",
	erro: "Erro",
};

const LABEL_STATUS_MANIFESTACAO: Record<string, string> = {
	sem_manifestacao: "Sem manifestação",
	ciencia_enviada: "Ciência enviada",
	confirmada: "Confirmada",
	desconhecida: "Desconhecida",
	nao_realizada: "Não realizada",
	evento_recebido: "Evento recebido",
};

function formatarData(data: string | null | undefined) {
	if (!data) return "-";
	return new Date(data).toLocaleString("pt-BR");
}

function formatarMoeda(valor: string | null | undefined) {
	if (!valor) return "-";
	const num = Number.parseFloat(valor);
	if (Number.isNaN(num)) return "-";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(num);
}

function podeImportarDocumento(doc: NfeInboundDocumento): boolean {
	return (
		doc.tipodocumento === "procNFe" &&
		!(doc.jaImportada ?? false) &&
		doc.statusimportacao === "disponivel"
	);
}

function podeContinuarRascunho(doc: NfeInboundDocumento): boolean {
	return (
		doc.tipodocumento === "procNFe" &&
		!(doc.jaImportada ?? false) &&
		Boolean(doc.idrascunho) &&
		doc.statusimportacao === "rascunho_criado"
	);
}

export default function CapturaSefazPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [acaoId, setAcaoId] = useState<string | null>(null);

	const idempresa = empresa?.id ?? "";

	const statusQuery = useQuery({
		queryKey: ["nfe-inbound-sync-status", idempresa],
		queryFn: () => obterStatusSyncNfeInbound(idempresa),
		enabled: Boolean(idempresa),
	});

	const documentosQuery = useQuery({
		queryKey: ["nfe-inbound-documentos", idempresa],
		queryFn: () =>
			listarDocumentosNfeInbound({ idempresa, page: 1, limit: 50 }),
		enabled: Boolean(idempresa),
	});

	const sincronizarMutation = useMutation({
		mutationFn: () => sincronizarNfeInbound(idempresa),
		onSuccess: (resultado) => {
			if (resultado.falhas.length > 0) {
				const motivos = [...new Set(resultado.falhas.map((f) => f.motivo))];
				toast.error(motivos[0] ?? "Falha na sincronização com a SEFAZ");
				if (motivos.length > 1) {
					toast.warning(
						`${resultado.falhas.length} falha(s): ${motivos.slice(1).join("; ")}`,
					);
				}
			} else if (resultado.quantidadeXml > 0) {
				toast.success(
					`Sincronização concluída: ${resultado.quantidadeXml} documento(s) processado(s).`,
				);
			} else if (resultado.cStat === "137") {
				toast.success(
					resultado.xMotivo
						? `SEFAZ (${resultado.cStat}): ${resultado.xMotivo}`
						: "SEFAZ (137): nenhum documento novo na fila de distribuição.",
				);
			} else {
				const detalheSefaz =
					resultado.cStat && resultado.xMotivo
						? ` SEFAZ [${resultado.cStat}] ${resultado.xMotivo}`
						: resultado.cStat
							? ` SEFAZ [${resultado.cStat}]`
							: "";
				toast.success(
					`Sincronização concluída: nenhum documento novo.${detalheSefaz}`,
				);
			}
			void queryClient.invalidateQueries({ queryKey: ["nfe-inbound-sync-status"] });
			void queryClient.invalidateQueries({ queryKey: ["nfe-inbound-documentos"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao sincronizar com a SEFAZ");
		},
	});

	const importarMutation = useMutation({
		mutationFn: (idDocumento: string) =>
			importarDocumentoNfeInbound(idempresa, idDocumento),
		onSuccess: (resultado) => {
			toast.success("Rascunho de importação criado.");
			void queryClient.invalidateQueries({ queryKey: ["nfe-inbound-documentos"] });
			router.push(resultado.urlRascunho);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao importar documento");
			if (error.message.includes("já foi importada")) {
				void queryClient.invalidateQueries({
					queryKey: ["nfe-inbound-documentos"],
				});
			}
		},
		onSettled: () => setAcaoId(null),
	});

	const manifestarMutation = useMutation({
		mutationFn: (idDocumento: string) =>
			manifestarCienciaNfeInbound(idempresa, idDocumento),
		onSuccess: () => {
			toast.success("Ciência da operação enviada. Sincronização em andamento.");
			void queryClient.invalidateQueries({ queryKey: ["nfe-inbound-sync-status"] });
			void queryClient.invalidateQueries({ queryKey: ["nfe-inbound-documentos"] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao manifestar ciência");
		},
		onSettled: () => setAcaoId(null),
	});

	const handleBaixarXml = async (doc: NfeInboundDocumento) => {
		setAcaoId(doc.id);
		try {
			await baixarXmlNfeInbound(idempresa, doc.id, doc.chavenfe);
		} catch {
			toast.error("Erro ao baixar XML");
		} finally {
			setAcaoId(null);
		}
	};

	const documentos = documentosQuery.data?.data ?? [];
	const syncStatus = statusQuery.data;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 p-4 md:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Captura SEFAZ</h1>
						<p className="text-muted-foreground text-sm">
							Sincronize NF-e de entrada destinadas ao CNPJ da empresa via Distribuição
							DF-e.
						</p>
					</div>
					<Button
						onClick={() => sincronizarMutation.mutate()}
						disabled={!idempresa || sincronizarMutation.isPending}
					>
						<RefreshCwIcon
							className={`mr-2 size-4 ${sincronizarMutation.isPending ? "animate-spin" : ""}`}
						/>
						Sincronizar
					</Button>
				</div>
				<Card>
					<CardHeader>
						<CardTitle>Status da sincronização</CardTitle>
						<CardDescription>
							Consulta incremental por NSU — sem busca repetitiva por chave.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<p className="text-muted-foreground text-sm">Última sincronização</p>
							<p className="font-medium">
								{formatarData(syncStatus?.ultimosync)}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Último NSU</p>
							<p className="font-mono text-sm">{syncStatus?.ultimonsu ?? "-"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Max NSU</p>
							<p className="font-mono text-sm">{syncStatus?.maxnsu ?? "-"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Situação</p>
							<p className="font-medium">
								{syncStatus?.sincronizando
									? "Sincronizando..."
									: syncStatus?.proximotentativa &&
										  new Date(syncStatus.proximotentativa) > new Date()
										? `Backoff até ${formatarData(syncStatus.proximotentativa)}`
										: "Pronto"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Documentos recebidos</CardTitle>
						<CardDescription>
							{documentosQuery.data?.paginacao.total ?? 0} documento(s) capturado(s)
						</CardDescription>
					</CardHeader>
					<CardContent>
						{documentosQuery.isLoading ? (
							<p className="text-muted-foreground text-sm">Carregando...</p>
						) : documentos.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Nenhum documento recebido. Clique em Sincronizar para consultar a
								SEFAZ.
							</p>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Emitente</TableHead>
											<TableHead>Nº/Série</TableHead>
											<TableHead>Emissão</TableHead>
											<TableHead>Valor</TableHead>
											<TableHead>Tipo</TableHead>
											<TableHead>Manifestação</TableHead>
											<TableHead>Importação</TableHead>
											<TableHead className="text-right">Ações</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{documentos.map((doc) => (
											<TableRow key={doc.id}>
												<TableCell>
													<div className="max-w-[180px] truncate font-medium">
														{doc.razaoemitente ?? "-"}
													</div>
													<div className="text-muted-foreground font-mono text-xs">
														{doc.chavenfe}
													</div>
												</TableCell>
												<TableCell>
													{doc.numero ?? "-"} / {doc.serie ?? "-"}
												</TableCell>
												<TableCell>{formatarData(doc.dataemissao)}</TableCell>
												<TableCell>{formatarMoeda(doc.valortotal)}</TableCell>
												<TableCell>
													<Badge variant="outline">{doc.tipodocumento}</Badge>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">
														{LABEL_STATUS_MANIFESTACAO[doc.statusmanifestacao] ??
															doc.statusmanifestacao}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge
														variant={
															doc.jaImportada ||
															doc.statusimportacao === "importado"
																? "secondary"
																: doc.statusimportacao === "disponivel"
																	? "default"
																	: "secondary"
														}
													>
														{doc.jaImportada ||
														doc.statusimportacao === "importado"
															? "Já importada"
															: (LABEL_STATUS_IMPORTACAO[doc.statusimportacao] ??
																doc.statusimportacao)}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex flex-wrap justify-end gap-1">
														{doc.tipodocumento === "resNFe" &&
															doc.statusmanifestacao === "sem_manifestacao" && (
																<Button
																	size="sm"
																	variant="outline"
																	disabled={
																		acaoId === doc.id ||
																		manifestarMutation.isPending
																	}
																	onClick={() => {
																		setAcaoId(doc.id);
																		manifestarMutation.mutate(doc.id);
																	}}
																	title="Manifestar ciência"
																>
																	<ShieldCheckIcon className="size-4" />
																</Button>
															)}
														{podeContinuarRascunho(doc) && (
															<Button size="sm" variant="outline" asChild>
																<Link
																	href={`/nota-fiscal-compra/rascunho/${doc.idrascunho}`}
																>
																	<FileInputIcon className="mr-1 size-4" />
																	Continuar
																</Link>
															</Button>
														)}
														{podeImportarDocumento(doc) && (
															<Button
																size="sm"
																variant="default"
																disabled={
																	acaoId === doc.id ||
																	importarMutation.isPending
																}
																onClick={() => {
																	setAcaoId(doc.id);
																	importarMutation.mutate(doc.id);
																}}
															>
																<FileInputIcon className="mr-1 size-4" />
																Importar
															</Button>
														)}
														{(doc.tipodocumento === "procNFe" ||
															doc.tipodocumento === "resNFe") && (
															<Button
																size="sm"
																variant="ghost"
																disabled={acaoId === doc.id}
																onClick={() => void handleBaixarXml(doc)}
																title="Baixar XML"
															>
																<DownloadIcon className="size-4" />
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</PageContainer>
	);
}