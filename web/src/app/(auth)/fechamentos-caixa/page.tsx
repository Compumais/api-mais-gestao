"use client";

import { IconFilter, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { TableSkeleton } from "@/components/table-skeleton";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	formatCurrency,
	STATUS_CAIXA,
	STATUS_CAIXA_LABEL,
} from "@/lib/gourmet-utils";
import type { FechamentoCaixa } from "@/services/fechamento-caixa.service";
import { fechamentoCaixaService } from "@/services/fechamento-caixa.service";
import { usuariosService } from "@/services/usuarios.service";
import { PageContainer } from "../components/page-container";

dayjs.locale("pt-br");

interface FiltrosState {
	dataInicio: string;
	dataFim: string;
	pdv: string;
	status: string;
}

const filtrosVazios: FiltrosState = {
	dataInicio: "",
	dataFim: "",
	pdv: "",
	status: "",
};

function filtrosAtivos(filtros: FiltrosState): boolean {
	return !!(filtros.dataInicio || filtros.dataFim || filtros.pdv || filtros.status);
}

function filtrarPorPeriodo(
	itens: FechamentoCaixa[],
	dataInicio: string,
	dataFim: string,
): FechamentoCaixa[] {
	return itens.filter((item) => {
		const data = item.datacriacao ?? item.datahora;
		if (!data) return true;
		const dia = dayjs(data);
		if (dataInicio && dia.isBefore(dayjs(dataInicio), "day")) return false;
		if (dataFim && dia.isAfter(dayjs(dataFim), "day")) return false;
		return true;
	});
}

export default function FechamentosCaixaPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();

	const [filtros, setFiltros] = useState<FiltrosState>(filtrosVazios);
	const [filtrosAplicados, setFiltrosAplicados] =
		useState<FiltrosState>(filtrosVazios);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 15,
	});

	const { data: usuariosData } = useQuery({
		queryKey: ["usuarios-lista", empresa?.id],
		queryFn: () =>
			usuariosService.listar({ idempresa: empresa!.id, limit: 500 }),
		enabled: !!empresa,
		staleTime: 60_000,
	});

	const usuariosPorId = useMemo(() => {
		const map: Record<string, string> = {};
		for (const u of usuariosData?.data ?? []) {
			map[u.id] = u.nome;
		}
		return map;
	}, [usuariosData]);

	const { data, isLoading } = useQuery({
		queryKey: [
			"fechamentos-caixa",
			empresa?.id,
			filtrosAplicados.pdv,
			filtrosAplicados.status,
		],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return fechamentoCaixaService.listar({
				idempresa: empresa.id,
				pdv: filtrosAplicados.pdv
					? Number(filtrosAplicados.pdv)
					: undefined,
				status: filtrosAplicados.status
					? Number(filtrosAplicados.status)
					: undefined,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const itensFiltrados = useMemo(() => {
		const base = data?.data ?? [];
		return filtrarPorPeriodo(
			base,
			filtrosAplicados.dataInicio,
			filtrosAplicados.dataFim,
		);
	}, [data?.data, filtrosAplicados.dataInicio, filtrosAplicados.dataFim]);

	const pageCount = Math.ceil(itensFiltrados.length / pagination.pageSize);
	const itensPaginados = itensFiltrados.slice(
		pagination.pageIndex * pagination.pageSize,
		(pagination.pageIndex + 1) * pagination.pageSize,
	);

	const columns: ColumnDef<FechamentoCaixa>[] = [
		{
			accessorKey: "id",
			header: "ID",
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.getValue("id")}</span>
			),
		},
		{
			accessorKey: "datacriacao",
			header: "Data / Hora",
			cell: ({ row }) => {
				const val =
					(row.getValue("datacriacao") as string | null) ??
					row.original.datahora;
				if (!val) return <span className="text-muted-foreground">—</span>;
				return <span>{dayjs(val).format("DD/MM/YYYY HH:mm")}</span>;
			},
		},
		{
			accessorKey: "pdv",
			header: "PDV",
			cell: ({ row }) => (
				<span className="font-mono">{row.getValue("pdv") ?? "—"}</span>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => {
				const status = row.getValue("status") as number | null;
				const label =
					status != null ? STATUS_CAIXA_LABEL[status] ?? status : "—";
				return (
					<Badge
						variant={
							status === STATUS_CAIXA.ABERTO ? "default" : "secondary"
						}
					>
						{label}
					</Badge>
				);
			},
		},
		{
			accessorKey: "idusuario",
			header: "Operador",
			cell: ({ row }) => {
				const id = row.getValue("idusuario") as string | null;
				if (!id) return "—";
				return (
					<span className="text-sm text-muted-foreground">
						{usuariosPorId[id] ?? id}
					</span>
				);
			},
		},
		{
			accessorKey: "suprimentoinicial",
			header: () => <span className="text-right block">Suprimento</span>,
			cell: ({ row }) => (
				<span className="text-right block">
					{formatCurrency(row.getValue("suprimentoinicial"))}
				</span>
			),
		},
		{
			accessorKey: "saldoapurado",
			header: () => <span className="text-right block">Total vendido</span>,
			cell: ({ row }) => (
				<span className="text-right block">
					{formatCurrency(row.getValue("saldoapurado"))}
				</span>
			),
		},
		{
			accessorKey: "saldoinformado",
			header: () => <span className="text-right block">Saldo informado</span>,
			cell: ({ row }) => (
				<span className="text-right block">
					{formatCurrency(row.getValue("saldoinformado"))}
				</span>
			),
		},
		{
			id: "diferenca",
			header: () => <span className="text-right block">Falta / Sobra</span>,
			cell: ({ row }) => {
				const falta = row.original.falta;
				const sobra = row.original.sobra;
				if (parseFloat(falta ?? "0") > 0) {
					return (
						<span className="text-right block text-destructive">
							-{formatCurrency(falta)}
						</span>
					);
				}
				if (parseFloat(sobra ?? "0") > 0) {
					return (
						<span className="text-right block text-amber-600">
							+{formatCurrency(sobra)}
						</span>
					);
				}
				return <span className="text-right block text-muted-foreground">—</span>;
			},
		},
	];

	const table = useReactTable({
		data: itensPaginados,
		columns,
		state: { pagination },
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: true,
		pageCount,
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

	const comFiltros = filtrosAtivos(filtrosAplicados);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Fechamentos de caixa</h1>
					{comFiltros && (
						<Badge variant="secondary" className="gap-1">
							<IconFilter className="size-3" />
							Filtros ativos
						</Badge>
					)}
				</div>

				<div className="mx-4 rounded-lg border bg-card p-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
						<Field>
							<FieldLabel>Data início</FieldLabel>
							<FieldGroup>
								<Input
									type="date"
									value={filtros.dataInicio}
									onChange={(e) =>
										setFiltros((f) => ({
											...f,
											dataInicio: e.target.value,
										}))
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
							<FieldLabel>PDV</FieldLabel>
							<FieldGroup>
								<Input
									type="number"
									placeholder="Ex: 1"
									value={filtros.pdv}
									onChange={(e) =>
										setFiltros((f) => ({ ...f, pdv: e.target.value }))
									}
								/>
							</FieldGroup>
						</Field>

						<Field>
							<FieldLabel>Status</FieldLabel>
							<FieldGroup>
								<Select
									value={filtros.status || "todos"}
									onValueChange={(v) =>
										setFiltros((f) => ({
											...f,
											status: v === "todos" ? "" : v,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Todos" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos</SelectItem>
										<SelectItem value={String(STATUS_CAIXA.ABERTO)}>
											Aberto
										</SelectItem>
										<SelectItem value={String(STATUS_CAIXA.FECHADO)}>
											Fechado
										</SelectItem>
									</SelectContent>
								</Select>
							</FieldGroup>
						</Field>

						<div className="flex items-end gap-2">
							<Button
								onClick={handleAplicarFiltros}
								className="flex-1 gap-2"
							>
								<IconFilter className="size-4" />
								Filtrar
							</Button>
							{comFiltros && (
								<Button
									variant="outline"
									onClick={handleLimparFiltros}
									aria-label="Limpar filtros"
								>
									<IconX className="size-4" />
								</Button>
							)}
						</div>
					</div>
				</div>

				<div className="mx-4 rounded-lg border bg-card">
					{!empresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os fechamentos
							</p>
						</div>
					) : isLoading ? (
						<TableSkeleton rows={8} columns={9}>
							<TableHead>ID</TableHead>
							<TableHead>Data</TableHead>
							<TableHead>PDV</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Operador</TableHead>
							<TableHead>Suprimento</TableHead>
							<TableHead>Apurado</TableHead>
							<TableHead>Informado</TableHead>
							<TableHead>Diferença</TableHead>
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((hg) => (
										<TableRow key={hg.id}>
											{hg.headers.map((header) => (
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
												Nenhum fechamento encontrado.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>

							{itensFiltrados.length > 0 && (
								<div className="flex items-center justify-between border-t px-4 py-3">
									<p className="text-sm text-muted-foreground">
										{itensFiltrados.length} registro
										{itensFiltrados.length !== 1 ? "s" : ""} • Página{" "}
										{pagination.pageIndex + 1} de {pageCount || 1}
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
		</PageContainer>
	);
}
