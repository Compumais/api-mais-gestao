"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Ban,
	Copy,
	Eye,
	Pencil,
	Plus,
	RefreshCw,
	Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { NFE_STATUS, NFE_STATUS_LABELS } from "@/constants/nfe-status";
import { useEmpresa } from "@/hooks/use-empresa";
import { maskCpfCnpj } from "@/lib/masks";
import {
	cancelarNfse,
	consultarNfsePorRps,
	listarNfsesEmitidas,
	type NotaFiscalServico,
	retransmitirNfse,
} from "@/services/nfse-emissao.service";
import { PageContainer } from "../components/page-container";
import { AvisoAmbienteNfse } from "./components/aviso-ambiente-nfse";

const formatCurrency = (value: string | null | undefined) => {
	if (!value) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(parseFloat(value));
};

const formatDateTime = (date: string | null | undefined) => {
	if (!date) return "-";
	return new Date(date).toLocaleString("pt-BR");
};

function notaPodeEditarOuRetransmitir(nota: NotaFiscalServico) {
	return (
		nota.status === NFE_STATUS.PENDENTE || nota.status === NFE_STATUS.REJEITADA
	);
}

function notaPodeCancelar(nota: NotaFiscalServico) {
	if (nota.status !== NFE_STATUS.AUTORIZADA) return false;
	const eventoPendente = Boolean(
		nota.dadosimportacao?.protocoloCancelamento ||
			nota.dadosimportacao?.protocoloSubstituicao,
	);
	return !eventoPendente;
}

function notaPodeConsultar(nota: NotaFiscalServico) {
	return nota.status !== NFE_STATUS.CANCELADA;
}

export default function NotaFiscalServicoPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [notaCancelar, setNotaCancelar] = useState<NotaFiscalServico | null>(
		null,
	);
	const [motivoCancelamento, setMotivoCancelamento] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["nfse-emissao", empresa?.id],
		queryFn: () =>
			listarNfsesEmitidas({ idempresa: empresa!.id, page: 1, limit: 50 }),
		enabled: !!empresa?.id,
	});

	const invalidateLista = () => {
		queryClient.invalidateQueries({ queryKey: ["nfse-emissao", empresa?.id] });
	};

	const cancelarMutation = useMutation({
		mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
			cancelarNfse(id, motivo),
		onSuccess: (resultado) => {
			if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Cancelamento recebido. Protocolo: ${resultado.protocolo}`
						: "Cancelamento aguardando validação do ambiente nacional",
				);
			} else {
				toast.success("NFS-e cancelada");
			}
			setNotaCancelar(null);
			setMotivoCancelamento("");
			invalidateLista();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const consultarMutation = useMutation({
		mutationFn: (id: string) => consultarNfsePorRps(id),
		onSuccess: (resultado) => {
			if (resultado.status === NFE_STATUS.CANCELADA) {
				toast.success(
					"Cancelamento/substituição confirmado no ambiente nacional",
				);
			} else if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else if (resultado.pendente) {
				toast.info(
					resultado.protocolo
						? `Aguardando processamento. Protocolo: ${resultado.protocolo}`
						: "Ainda em processamento no ambiente nacional",
				);
			} else {
				toast.success("Consulta realizada");
			}
			invalidateLista();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const retransmitirMutation = useMutation({
		mutationFn: (id: string) => retransmitirNfse(id),
		onSuccess: (resultado) => {
			if (resultado.numeroNfse) {
				toast.success(`NFS-e ${resultado.numeroNfse} autorizada`);
			} else if (resultado.protocolo) {
				toast.warning(
					`DPS recebida. Protocolo: ${resultado.protocolo}. Consulte o status.`,
				);
			} else {
				toast.warning("Retransmissão concluída — consulte o status");
			}
			invalidateLista();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	if (!empresa) {
		return (
			<PageContainer>
				<p className="text-muted-foreground px-4">
					Selecione uma empresa para visualizar as NFS-e
				</p>
			</PageContainer>
		);
	}

	const motivoValido = motivoCancelamento.trim().length >= 15;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-3 px-4">
					<div>
						<h1 className="text-2xl font-bold">Nota fiscal de serviço</h1>
						<p className="text-muted-foreground text-sm">
							Emissão manual de NFS-e (RPS)
						</p>
					</div>
					<div className="flex items-center gap-2">
						<AvisoAmbienteNfse ambiente={2} />
						<Button asChild>
							<Link href="/nota-fiscal-servico/nova">
								<Plus className="h-4 w-4 mr-2" aria-hidden="true" />
								Nova NFS-e
							</Link>
						</Button>
					</div>
				</div>

				<div className="px-4">
					{isLoading ? (
						<p className="text-muted-foreground">Carregando...</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>RPS</TableHead>
									<TableHead>NFS-e</TableHead>
									<TableHead>Tomador</TableHead>
									<TableHead>Data</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-12 text-end">Ações</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(data?.data ?? []).length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={7}
											className="text-center text-muted-foreground"
										>
											Nenhuma NFS-e emitida
										</TableCell>
									</TableRow>
								) : (
									data?.data.map((nota) => {
										const podeEditar = notaPodeEditarOuRetransmitir(nota);
										const podeCancelar = notaPodeCancelar(nota);
										const podeConsultar = notaPodeConsultar(nota);
										const ocupado =
											consultarMutation.isPending ||
											retransmitirMutation.isPending ||
											cancelarMutation.isPending;

										return (
											<TableRow key={nota.id}>
												<TableCell>
													<Link
														href={`/nota-fiscal-servico/${nota.id}`}
														className="font-medium hover:underline"
													>
														{nota.serie}-{nota.numeronotafiscal}
													</Link>
												</TableCell>
												<TableCell>{nota.numeronfse ?? "—"}</TableCell>
												<TableCell className="max-w-[240px]">
													<div className="truncate font-medium">
														{nota.razaosocial ?? "—"}
													</div>
													{nota.cnpjcpf ? (
														<div className="truncate text-xs text-muted-foreground font-mono">
															{maskCpfCnpj(nota.cnpjcpf)}
														</div>
													) : null}
												</TableCell>
												<TableCell>
													{formatDateTime(
														nota.emissao ?? nota.datahoraemissao,
													)}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(nota.valortotalnota)}
												</TableCell>
												<TableCell>
													{NFE_STATUS_LABELS[nota.status ?? 90] ??
														nota.status}
												</TableCell>
												<TableCell className="text-end">
													<div className="flex justify-end">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																	aria-label="Abrir menu de ações"
																	disabled={ocupado}
																>
																	<IconDotsVertical className="size-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem asChild>
																	<Link
																		href={`/nota-fiscal-servico/${nota.id}`}
																	>
																		<Eye className="size-4" />
																		Ver
																	</Link>
																</DropdownMenuItem>
																{podeConsultar ? (
																	<DropdownMenuItem
																		disabled={consultarMutation.isPending}
																		onClick={() =>
																			consultarMutation.mutate(nota.id)
																		}
																	>
																		<Search className="size-4" />
																		Consultar
																	</DropdownMenuItem>
																) : null}
																{podeEditar ? (
																	<DropdownMenuItem asChild>
																		<Link
																			href={`/nota-fiscal-servico/nova?origem=${nota.id}`}
																		>
																			<Pencil className="size-4" />
																			Editar
																		</Link>
																	</DropdownMenuItem>
																) : null}
																{podeEditar ? (
																	<DropdownMenuItem
																		disabled={
																			retransmitirMutation.isPending
																		}
																		onClick={() =>
																			retransmitirMutation.mutate(nota.id)
																		}
																	>
																		<RefreshCw className="size-4" />
																		Retransmitir
																	</DropdownMenuItem>
																) : null}
																<DropdownMenuItem asChild>
																	<Link
																		href={`/nota-fiscal-servico/nova?origem=${nota.id}`}
																	>
																		<Copy className="size-4" />
																		Duplicar
																	</Link>
																</DropdownMenuItem>
																{podeCancelar ? (
																	<>
																		<DropdownMenuSeparator />
																		<DropdownMenuItem
																			variant="destructive"
																			onClick={() => {
																				setMotivoCancelamento("");
																				setNotaCancelar(nota);
																			}}
																		>
																			<Ban className="size-4" />
																			Cancelar
																		</DropdownMenuItem>
																	</>
																) : null}
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					)}
				</div>
			</div>

			<AlertDialog
				open={!!notaCancelar}
				onOpenChange={(open) => {
					if (!open) {
						setNotaCancelar(null);
						setMotivoCancelamento("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar NFS-e</AlertDialogTitle>
						<AlertDialogDescription>
							Informe o motivo do cancelamento (mínimo 15 caracteres)
							{notaCancelar?.numeronfse
								? ` da NFS-e ${notaCancelar.numeronfse}`
								: ""}
							.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-2">
						<Textarea
							value={motivoCancelamento}
							onChange={(e) => setMotivoCancelamento(e.target.value)}
							placeholder="Descreva o motivo do cancelamento..."
							rows={4}
							maxLength={255}
						/>
						<p className="text-muted-foreground text-xs">
							{motivoCancelamento.trim().length}/15 caracteres mínimos
						</p>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelarMutation.isPending}>
							Voltar
						</AlertDialogCancel>
						<Button
							variant="destructive"
							disabled={!motivoValido || cancelarMutation.isPending}
							onClick={() => {
								if (!notaCancelar || !motivoValido) return;
								cancelarMutation.mutate({
									id: notaCancelar.id,
									motivo: motivoCancelamento.trim(),
								});
							}}
						>
							{cancelarMutation.isPending
								? "Cancelando..."
								: "Confirmar cancelamento"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</PageContainer>
	);
}
