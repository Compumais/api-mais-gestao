"use client";

import { IconPencil, IconPrinter, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import { Ban, FileX2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CupomNaoFiscal } from "@/components/pdv/cupom-nao-fiscal";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	NFE_AMBIENTE_LABELS,
	NFE_STATUS,
	NFE_STATUS_LABELS,
} from "@/constants/nfe-status";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	formatCurrency,
	type CupomNaoFiscalData,
	type PagamentoParcialPdv,
} from "@/lib/gourmet-utils";
import {
	cancelarNfe,
	inutilizarNfe,
	type NotaFiscalEmitida,
} from "@/services/nfe-emissao.service";
import {
	nfceService,
	type DadosCupomNfceApi,
	type NfceListagem,
} from "@/services/nfce.service";
import { obterCodigoRejeicaoNota, obterMotivoRejeicaoNota } from "@/util/nfe-rejeicao-util";
import {
	notaPodeSerCancelada,
	notaPodeSerInutilizada,
} from "@/util/validar-eventos-nfe";
import { ModalEventoNfe } from "../nota-fiscal-venda/components/modal-evento-nfe";
import { StatusNfeBadge } from "../nota-fiscal-venda/components/status-nfe-badge";
import { PageContainer } from "../components/page-container";

const FILTRO_TODOS = "todos";

const OPCOES_STATUS = [
	{ value: FILTRO_TODOS, label: "Todos os status" },
	{ value: String(NFE_STATUS.PENDENTE), label: NFE_STATUS_LABELS[NFE_STATUS.PENDENTE] },
	{ value: String(NFE_STATUS.AUTORIZADA), label: NFE_STATUS_LABELS[NFE_STATUS.AUTORIZADA] },
	{ value: String(NFE_STATUS.REJEITADA), label: NFE_STATUS_LABELS[NFE_STATUS.REJEITADA] },
	{ value: String(NFE_STATUS.CANCELADA), label: NFE_STATUS_LABELS[NFE_STATUS.CANCELADA] },
	{ value: String(NFE_STATUS.INUTILIZADA), label: NFE_STATUS_LABELS[NFE_STATUS.INUTILIZADA] },
	{ value: String(NFE_STATUS.DENEGADA), label: NFE_STATUS_LABELS[NFE_STATUS.DENEGADA] },
];

function paraNotaFiscalEmitida(nota: NfceListagem): NotaFiscalEmitida {
	return {
		id: nota.idnotafiscal,
		idempresa: "",
		numeronotafiscal: nota.numeronotafiscal,
		serie: nota.serie,
		chavenfe: nota.chavenfe,
		protocolonfe: nota.protocolonfe,
		status: nota.status,
		tipoambientenfe: nota.tipoambientenfe,
		valortotalnota: nota.valortotalnota,
		emissao: nota.emissao,
		datahoraemissao: nota.datahoraemissao,
		mensagemtransmissaonfe: nota.mensagemtransmissaonfe,
		codigostatusprotocolonfe: nota.codigostatusprotocolonfe,
	};
}

function formatarValor(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "R$ 0,00";
	return formatCurrency(n);
}

function obterDataExibicao(nota: NfceListagem) {
	return nota.datahoraemissao ?? nota.emissao ?? nota.datainclusao;
}

function mapearCupomApi(dados: DadosCupomNfceApi): CupomNaoFiscalData {
	return {
		vendaId: dados.vendaId,
		empresaNome: dados.empresaNome,
		dataHora: new Date(dados.dataHora),
		itens: dados.itens,
		subtotal: dados.subtotal,
		desconto: dados.desconto,
		taxaServico: dados.taxaServico,
		couvert: dados.couvert,
		total: dados.total,
		pagamentos: dados.pagamentos.map((pagamento) => ({
			meio: pagamento.meio as PagamentoParcialPdv["meio"],
			label: pagamento.label,
			valor: pagamento.valor,
		})),
		troco: dados.troco,
		nfce: dados.nfce,
	};
}

export default function NfcePage() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [filtroStatus, setFiltroStatus] = useState(FILTRO_TODOS);
	const [reemitindoId, setReemitindoId] = useState<string | null>(null);
	const [cupomDados, setCupomDados] = useState<CupomNaoFiscalData | null>(null);
	const [carregandoCupomId, setCarregandoCupomId] = useState<string | null>(null);
	const [eventoModal, setEventoModal] = useState<{
		tipo: "cancelar" | "inutilizar";
		nota: NfceListagem;
	} | null>(null);

	const statusFiltro =
		filtroStatus === FILTRO_TODOS ? undefined : Number(filtroStatus);

	const { data, isLoading } = useQuery({
		queryKey: ["nfce", idempresa, page, filtroStatus],
		queryFn: () =>
			nfceService.listar({
				idempresa,
				status: statusFiltro,
				page,
				limit: 20,
			}),
		enabled: !!idempresa,
	});

	const reemitirMutation = useMutation({
		mutationFn: (idnotafiscal: string) =>
			nfceService.reemitir({ idempresa, idnotafiscal }),
		onSuccess: (resultado) => {
			if (resultado.emitida) {
				toast.success("NFC-e autorizada com sucesso!");
			} else {
				const motivo =
					resultado.xMotivo ??
					resultado.erro ??
					resultado.pendencias?.map((p) => p.mensagem).join("; ") ??
					"Falha na reemissão";
				toast.error(`NFC-e não autorizada: ${motivo}`);
			}
			queryClient.invalidateQueries({ queryKey: ["nfce", idempresa] });
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao reemitir NFC-e");
		},
		onSettled: () => {
			setReemitindoId(null);
		},
	});

	const eventoMutation = useMutation({
		mutationFn: async ({
			tipo,
			nota,
			justificativa,
		}: {
			tipo: "cancelar" | "inutilizar";
			nota: NfceListagem;
			justificativa: string;
		}) => {
			if (tipo === "cancelar") {
				return cancelarNfe(nota.idnotafiscal, justificativa);
			}
			return inutilizarNfe(nota.idnotafiscal, justificativa);
		},
		onSuccess: (_, variables) => {
			toast.success(
				variables.tipo === "cancelar"
					? "NFC-e cancelada com sucesso"
					: "Numeração inutilizada com sucesso",
			);
			setEventoModal(null);
			queryClient.invalidateQueries({ queryKey: ["nfce", idempresa] });
		},
		onError: (error: Error, variables) => {
			toast.error(
				variables.tipo === "cancelar"
					? error.message || "Não foi possível cancelar a NFC-e"
					: error.message || "Não foi possível inutilizar a numeração",
			);
		},
	});

	const handleImprimirCupom = async (idnotafiscal: string) => {
		setCarregandoCupomId(idnotafiscal);
		try {
			const dados = await nfceService.buscarCupom(idnotafiscal);
			setCupomDados(mapearCupomApi(dados));
		} catch (erro) {
			toast.error(
				erro instanceof Error ? erro.message : "Erro ao carregar cupom NFC-e",
			);
		} finally {
			setCarregandoCupomId(null);
		}
	};

	const columns = useMemo<ColumnDef<NfceListagem>[]>(
		() => [
			{
				header: "Data",
				cell: ({ row }) => {
					const data = obterDataExibicao(row.original);
					return data ? dayjs(data).format("DD/MM/YYYY HH:mm") : "—";
				},
			},
			{
				header: "Número",
				cell: ({ row }) => {
					const { numeronotafiscal, serie } = row.original;
					if (!numeronotafiscal) return "—";
					return serie ? `${numeronotafiscal}/${serie}` : numeronotafiscal;
				},
			},
			{
				header: "Venda PDV",
				accessorKey: "idvenda",
				cell: ({ row }) =>
					row.original.idvenda ? row.original.idvenda.slice(0, 8) : "—",
			},
			{
				header: "Valor",
				accessorKey: "valortotalnota",
				cell: ({ row }) => formatarValor(row.original.valortotalnota),
			},
			{
				header: "Status",
				cell: ({ row }) => {
					const nota = paraNotaFiscalEmitida(row.original);
					return (
						<StatusNfeBadge
							status={nota.status}
							cStat={obterCodigoRejeicaoNota(nota)}
							xMotivo={obterMotivoRejeicaoNota(nota)}
							size="sm"
						/>
					);
				},
			},
			{
				header: "Ambiente",
				cell: ({ row }) => {
					const ambiente = row.original.tipoambientenfe;
					if (ambiente == null) return "—";
					return NFE_AMBIENTE_LABELS[ambiente] ?? ambiente;
				},
			},
			{
				header: "Chave",
				cell: ({ row }) =>
					row.original.chavenfe ? (
						<span className="font-mono text-xs">
							{row.original.chavenfe.slice(-8)}
						</span>
					) : (
						"—"
					),
			},
			{
				id: "acoes",
				header: "",
				cell: ({ row }) => {
					const nota = row.original;
					const notaEmitida = paraNotaFiscalEmitida(nota);
					const podeReemitir =
						nota.status === NFE_STATUS.PENDENTE ||
						nota.status === NFE_STATUS.REJEITADA ||
						nota.status === NFE_STATUS.DENEGADA;
					const podeAlterar = podeReemitir;
					const podeImprimir = nota.status === NFE_STATUS.AUTORIZADA;
					const podeCancelar = notaPodeSerCancelada(notaEmitida).permitido;
					const podeInutilizar = notaPodeSerInutilizada(notaEmitida).permitido;

					return (
						<div className="flex flex-wrap items-center justify-end gap-1">
							{podeAlterar && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									asChild
								>
									<Link
										href={`/nfce/editar?editarNfce=${nota.idnotafiscal}`}
									>
										<IconPencil className="size-4" />
										Alterar
									</Link>
								</Button>
							)}
							{podeReemitir && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={reemitindoId === nota.idnotafiscal}
									onClick={() => {
										setReemitindoId(nota.idnotafiscal);
										reemitirMutation.mutate(nota.idnotafiscal);
									}}
								>
									<IconRefresh className="size-4" />
									{reemitindoId === nota.idnotafiscal
										? "Enviando..."
										: "Retransmitir"}
								</Button>
							)}
							{podeImprimir && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={carregandoCupomId === nota.idnotafiscal}
									onClick={() => {
										void handleImprimirCupom(nota.idnotafiscal);
									}}
								>
									<IconPrinter className="size-4" />
									{carregandoCupomId === nota.idnotafiscal
										? "Carregando..."
										: "Imprimir"}
								</Button>
							)}
							{podeCancelar && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="text-destructive"
									onClick={() =>
										setEventoModal({ tipo: "cancelar", nota })
									}
								>
									<Ban className="size-4" />
									Cancelar
								</Button>
							)}
							{podeInutilizar && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() =>
										setEventoModal({ tipo: "inutilizar", nota })
									}
								>
									<FileX2 className="size-4" />
									Inutilizar
								</Button>
							)}
						</div>
					);
				},
			},
		],
		[idempresa, reemitindoId, reemitirMutation, carregandoCupomId],
	);

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const totalPages = data?.paginacao.totalPages ?? 1;

	if (!idempresa) {
		return (
			<PageContainer>
				<div className="px-4 py-4">
					<p className="text-muted-foreground">
						Selecione uma empresa no menu superior.
					</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold">NFC-e</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Cupons fiscais emitidos pelo PDV — pendentes, autorizados e
							rejeitados
						</p>
					</div>
					<div className="w-full sm:w-56">
						<Select
							value={filtroStatus}
							onValueChange={(valor) => {
								setFiltroStatus(valor);
								setPage(1);
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								{OPCOES_STATUS.map((opcao) => (
									<SelectItem key={opcao.value} value={opcao.value}>
										{opcao.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="px-4">
					{isLoading ? (
						<TableSkeleton columns={8} rows={8}>
							<TableHead>Data</TableHead>
							<TableHead>Número</TableHead>
							<TableHead>Venda PDV</TableHead>
							<TableHead>Valor</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Ambiente</TableHead>
							<TableHead>Chave</TableHead>
							<TableHead />
						</TableSkeleton>
					) : (
						<>
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										{table.getHeaderGroups().map((headerGroup) => (
											<TableRow key={headerGroup.id}>
												{headerGroup.headers.map((header) => (
													<TableHead key={header.id}>
														{header.isPlaceholder
															? null
															: flexRender(
																	header.column.columnDef.header,
																	header.getContext(),
																)}
													</TableHead>
												))}
											</TableRow>
										))}
									</TableHeader>
									<TableBody>
										{table.getRowModel().rows.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={columns.length}
													className="h-24 text-center text-muted-foreground"
												>
													Nenhuma NFC-e encontrada.
												</TableCell>
											</TableRow>
										) : (
											table.getRowModel().rows.map((row) => (
												<TableRow key={row.id}>
													{row.getVisibleCells().map((cell) => (
														<TableCell key={cell.id}>
															{flexRender(
																cell.column.columnDef.cell,
																cell.getContext(),
															)}
														</TableCell>
													))}
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>

							{totalPages > 1 && (
								<div className="mt-4 flex items-center justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => setPage((p) => Math.max(1, p - 1))}
									>
										Anterior
									</Button>
									<span className="text-sm text-muted-foreground">
										Página {page} de {totalPages}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={page >= totalPages}
										onClick={() => setPage((p) => p + 1)}
									>
										Próxima
									</Button>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			<ModalEventoNfe
				open={eventoModal != null}
				onClose={() => setEventoModal(null)}
				carregando={eventoMutation.isPending}
				titulo={
					eventoModal?.tipo === "cancelar"
						? "Cancelar NFC-e"
						: "Inutilizar numeração"
				}
				descricao={
					eventoModal?.tipo === "cancelar"
						? "Informe a justificativa do cancelamento (mínimo 15 caracteres)."
						: "Informe a justificativa da inutilização (mínimo 15 caracteres)."
				}
				rotuloConfirmar={
					eventoModal?.tipo === "cancelar" ? "Cancelar NFC-e" : "Inutilizar"
				}
				onConfirmar={(justificativa) => {
					if (!eventoModal) return;
					eventoMutation.mutate({
						tipo: eventoModal.tipo,
						nota: eventoModal.nota,
						justificativa,
					});
				}}
			/>

			<Dialog
				open={cupomDados != null}
				onOpenChange={(aberto) => {
					if (!aberto) setCupomDados(null);
				}}
			>
				<DialogContent className="flex max-h-[95vh] flex-col sm:max-w-lg">
					{cupomDados && (
						<CupomNaoFiscal
							dados={cupomDados}
							onFechar={() => setCupomDados(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}
