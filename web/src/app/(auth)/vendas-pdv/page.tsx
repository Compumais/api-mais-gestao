"use client";

import { IconFilter, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	useInterpretarRejeicaoNfce,
	useNfceDetalhes,
} from "@/hooks/use-nfce-detalhes";
import { produtosService } from "@/services/produtos.service";
import { usuariosService } from "@/services/usuarios.service";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import { vendaPdvGourmetService } from "@/services/venda-pdv-gourmet.service";
import { PageContainer } from "../components/page-container";
import { DialogDetalhesNfce } from "../nfce/components/dialog-detalhes-nfce";
import { ItensVendaDialog } from "./itens-venda-dialog";
import { criarColunasVendasPdv } from "./vendas-pdv-colunas";
import { filtrosAtivos, idNfceVenda } from "./vendas-pdv-helpers";

interface FiltrosState {
	dataInicio: string;
	dataFim: string;
	numeropdv: string;
}

const filtrosVazios: FiltrosState = {
	dataInicio: "",
	dataFim: "",
	numeropdv: "",
};

export default function VendasPdvPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const [filtros, setFiltros] = useState<FiltrosState>(filtrosVazios);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosState>(filtrosVazios);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 15,
	});

	const [vendaSelecionada, setVendaSelecionada] =
		useState<VendaPdvGourmet | null>(null);
	const [dialogItensAberto, setDialogItensAberto] = useState(false);
	const [detalhesNotaId, setDetalhesNotaId] = useState<string | null>(null);

	const { data: produtosData } = useQuery({
		queryKey: ["produtos-lista", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return produtosService.listarTodos({
				idempresa: empresa.id,
				inativo: 0,
			});
		},
		enabled: !!empresa,
		staleTime: 60_000,
	});

	const { data: usuariosLista } = useQuery({
		queryKey: ["usuarios-lista", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return usuariosService.listarTodos({ idempresa: empresa.id });
		},
		enabled: !!empresa,
		staleTime: 60_000,
	});

	const produtosPorId = useMemo(() => {
		const map: Record<string, string> = {};
		for (const p of produtosData ?? []) {
			map[p.id] = p.nome;
		}
		return map;
	}, [produtosData]);

	const usuariosPorId = useMemo(() => {
		const map: Record<string, string> = {};
		for (const u of usuariosLista ?? []) {
			map[u.id] = u.nome;
		}
		return map;
	}, [usuariosLista]);

	const { data, isLoading } = useQuery({
		queryKey: [
			"vendas-pdv-gourmet",
			empresa?.id,
			filtrosAplicados,
			pagination.pageIndex + 1,
			pagination.pageSize,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return vendaPdvGourmetService.listar({
				idempresa: empresa.id,
				dataInicio: filtrosAplicados.dataInicio || undefined,
				dataFim: filtrosAplicados.dataFim || undefined,
				numeropdv: filtrosAplicados.numeropdv
					? Number(filtrosAplicados.numeropdv)
					: undefined,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			});
		},
		enabled: !!empresa,
	});

	const handleAplicarFiltros = () => {
		setPagination((p) => ({ ...p, pageIndex: 0 }));
		setFiltrosAplicados({ ...filtros });
	};

	const handleLimparFiltros = () => {
		setFiltros(filtrosVazios);
		setFiltrosAplicados(filtrosVazios);
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	};

	const handleVerItens = useCallback((venda: VendaPdvGourmet) => {
		setVendaSelecionada(venda);
		setDialogItensAberto(true);
	}, []);

	const handleVerNfce = useCallback((venda: VendaPdvGourmet) => {
		const id = idNfceVenda(venda);
		if (id) setDetalhesNotaId(id);
	}, []);

	const detalhesQuery = useNfceDetalhes({
		idempresa: empresa?.id ?? "",
		idnotafiscal: detalhesNotaId,
		enabled: detalhesNotaId != null && !!empresa,
	});
	const interpretacaoQuery = useInterpretarRejeicaoNfce({
		idempresa: empresa?.id ?? "",
		idnotafiscal: detalhesNotaId,
		enabled:
			detalhesNotaId != null &&
			!!empresa &&
			detalhesQuery.data?.rejeicao != null &&
			Boolean(detalhesQuery.data.iaDisponivel),
	});

	const columns = useMemo(
		() =>
			criarColunasVendasPdv({
				usuariosPorId,
				onVerItens: handleVerItens,
				onVerNfce: handleVerNfce,
			}),
		[usuariosPorId, handleVerItens, handleVerNfce],
	);

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		state: { pagination },
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const comFiltros = filtrosAtivos(filtrosAplicados);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-bold">Histórico de vendas PDV</h1>
						<p className="text-sm text-muted-foreground">
							Pagamento, fiscal/não fiscal, status da NFC-e e consulta. Horários
							em Brasília (GMT−3).
						</p>
					</div>
					{comFiltros && (
						<Badge variant="secondary" className="gap-1">
							<IconFilter className="size-3" aria-hidden="true" />
							Filtros ativos
						</Badge>
					)}
				</div>

				<div className="mx-4 rounded-lg border bg-card p-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<Field>
							<FieldLabel>Data início</FieldLabel>
							<FieldGroup>
								<Input
									type="date"
									value={filtros.dataInicio}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, dataInicio: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<Field>
							<FieldLabel>Data fim</FieldLabel>
							<FieldGroup>
								<Input
									type="date"
									value={filtros.dataFim}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, dataFim: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<Field>
							<FieldLabel>Nº do PDV</FieldLabel>
							<FieldGroup>
								<Input
									type="number"
									placeholder="Ex: 1"
									value={filtros.numeropdv}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, numeropdv: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<div className="flex items-end gap-2">
							<Button onClick={handleAplicarFiltros} className="flex-1 gap-2">
								<IconFilter className="size-4" aria-hidden="true" />
								Filtrar
							</Button>
							{comFiltros && (
								<Button
									variant="outline"
									onClick={handleLimparFiltros}
									aria-label="Limpar filtros"
								>
									<IconX className="size-4" aria-hidden="true" />
								</Button>
							)}
						</div>
					</div>
				</div>

				<div className="mx-4 overflow-x-auto rounded-lg border bg-card">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar as vendas
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={10} columns={9}>
							<TableHead>Nº PDV</TableHead>
							<TableHead>Data / Hora</TableHead>
							<TableHead>Origem</TableHead>
							<TableHead>Operador</TableHead>
							<TableHead>Pagamento</TableHead>
							<TableHead>Fiscal</TableHead>
							<TableHead>NFC-e</TableHead>
							<TableHead>Total</TableHead>
							<TableHead />
						</TableSkeleton>
					) : (
						<>
							<Table className="min-w-[960px]">
								<TableHeader>
									{table.getHeaderGroups().map((hg) => (
										<TableRow key={hg.id}>
											{hg.headers.map((header) => (
												<TableHead
													key={header.id}
													className={header.id === "acoes" ? "text-right" : ""}
												>
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
									{table.getRowModel().rows.length ? (
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
									) : (
										<TableRow>
											<TableCell
												colSpan={columns.length}
												className="h-24 text-center text-muted-foreground"
											>
												Nenhuma venda encontrada para os filtros selecionados.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>

							{(data?.paginacao.totalPages ?? 0) > 0 && (
								<div className="flex items-center justify-between border-t px-4 py-3">
									<p className="text-sm text-muted-foreground">
										{data?.paginacao.total ?? 0} venda
										{(data?.paginacao.total ?? 0) !== 1 ? "s" : ""} • Página{" "}
										{pagination.pageIndex + 1} de{" "}
										{data?.paginacao.totalPages ?? 1}
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.previousPage()}
											disabled={!table.getCanPreviousPage()}
										>
											Anterior
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => table.nextPage()}
											disabled={!table.getCanNextPage()}
										>
											Próxima
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{empresa && (
				<ItensVendaDialog
					venda={vendaSelecionada}
					idempresa={empresa.id}
					open={dialogItensAberto}
					onOpenChange={setDialogItensAberto}
					produtosPorId={produtosPorId}
					usuariosPorId={usuariosPorId}
				/>
			)}

			<DialogDetalhesNfce
				open={detalhesNotaId != null}
				onOpenChange={(aberto) => {
					if (!aberto) setDetalhesNotaId(null);
				}}
				carregando={detalhesQuery.isLoading}
				erro={detalhesQuery.error instanceof Error ? detalhesQuery.error : null}
				detalhes={detalhesQuery.data}
				interpretacao={interpretacaoQuery.data}
				carregandoInterpretacao={interpretacaoQuery.isFetching}
				erroInterpretacao={
					interpretacaoQuery.error instanceof Error
						? interpretacaoQuery.error
						: null
				}
			/>
		</PageContainer>
	);
}
