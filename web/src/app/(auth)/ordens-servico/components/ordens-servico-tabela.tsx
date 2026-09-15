"use client";

import {
	IconChevronDown,
	IconDotsVertical,
	IconEye,
	IconLayoutColumns,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
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
import {
	TABELA_ORDENS_SERVICO,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import type {
	ConfiguracaoOrdemServico,
	OrdemServico,
	TipoOrdemServicoEvento,
} from "@/services/ordem-servico.service";
import { osBloqueadaEdicao, osPodeExcluir } from "@/util/ordem-servico-ui";
import {
	type ConfigFiltroColunaOs,
	criarColunasOrdensServico,
	type FiltrosColunaOsState,
	type MapaNomes,
	visibilidadePadraoColunasOs,
} from "../ordens-servico-colunas";
import type { OrdenacaoColunaOs } from "./cabecalho-coluna-os";
import { OrdemServicoStatusBadge } from "./ordem-servico-status-badge";

type OrdensServicoTabelaProps = {
	ordens: OrdemServico[];
	isLoading: boolean;
	tipos: TipoOrdemServicoEvento[];
	config: ConfiguracaoOrdemServico | null | undefined;
	configPronta?: boolean;
	mapaUsuarios: MapaNomes;
	mapaObjetos: MapaNomes;
	mapaAreas: MapaNomes;
	mapaTiposProblema: MapaNomes;
	comFiltros: boolean;
	page: number;
	totalPages: number;
	totalRegistros: number;
	onPageChange: (page: number) => void;
	onExcluir: (os: OrdemServico) => void;
	filtros: FiltrosColunaOsState;
	ordenarPor: string | null;
	ordem: "asc" | "desc" | null;
	onOrdenarColuna: (colunaId: string, direcao: OrdenacaoColunaOs) => void;
	onFiltrarColuna: (colunaId: string, valor: string) => void;
	configFiltroPorColuna: Record<string, ConfigFiltroColunaOs>;
};

function rotuloColuna(column: {
	id: string;
	columnDef: { meta?: unknown; header?: unknown };
}) {
	const meta = column.columnDef.meta as { label?: string } | undefined;
	if (meta?.label) return meta.label;
	if (typeof column.columnDef.header === "string") {
		return column.columnDef.header;
	}
	return column.id;
}

export function OrdensServicoTabela({
	ordens,
	isLoading,
	tipos,
	config,
	configPronta = true,
	mapaUsuarios,
	mapaObjetos,
	mapaAreas,
	mapaTiposProblema,
	comFiltros,
	page,
	totalPages,
	totalRegistros,
	onPageChange,
	onExcluir,
	filtros,
	ordenarPor,
	ordem,
	onOrdenarColuna,
	onFiltrarColuna,
	configFiltroPorColuna,
}: OrdensServicoTabelaProps) {
	const router = useRouter();

	const visibilidadePadrao = useMemo(
		() =>
			visibilidadePadraoColunasOs({
				config,
				camposextras: config?.camposextras,
			}),
		[config],
	);

	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_ORDENS_SERVICO, visibilidadePadrao, {
			enabled: configPronta,
		});

	const colunas = useMemo(
		() =>
			criarColunasOrdensServico({
				config,
				mapaUsuarios,
				mapaObjetos,
				mapaAreas,
				mapaTiposProblema,
				filtros,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderStatus: (status) => (
					<OrdemServicoStatusBadge status={status} tipos={tipos} />
				),
				renderAcoes: (os) => {
					const podeEditar = !osBloqueadaEdicao(os);
					const podeExcluir = osPodeExcluir(os);

					return (
						<div className="flex justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										aria-label={`Ações da OS ${os.codigo ?? ""}`}
									>
										<IconDotsVertical className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => router.push(`/ordens-servico/${os.id}`)}
									>
										<IconEye className="size-4" />
										Visualizar
									</DropdownMenuItem>
									{podeEditar && (
										<DropdownMenuItem
											onClick={() => router.push(`/ordens-servico/${os.id}`)}
										>
											<IconPencil className="size-4" />
											Editar
										</DropdownMenuItem>
									)}
									{podeExcluir && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onClick={() => onExcluir(os)}
											>
												<IconTrash className="size-4" />
												Excluir
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
			}),
		[
			tipos,
			config,
			mapaUsuarios,
			mapaObjetos,
			mapaAreas,
			mapaTiposProblema,
			filtros,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			router,
			onExcluir,
		],
	);

	const tabela = useReactTable({
		data: ordens,
		columns: colunas,
		state: { columnVisibility },
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
	});

	const colunasVisiveis = tabela.getVisibleLeafColumns();
	const quantidadeColunasVisiveis = colunasVisiveis.length;

	const mostrarSkeleton = isLoading || isLoadingPreferencias;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-end">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<IconLayoutColumns className="size-4" />
							<span className="hidden lg:inline">Personalizar Colunas</span>
							<span className="lg:hidden">Colunas</span>
							<IconChevronDown className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="max-h-72 w-56 overflow-y-auto"
					>
						{tabela
							.getAllColumns()
							.filter((column) => column.getCanHide())
							.map((column) => (
								<DropdownMenuCheckboxItem
									key={column.id}
									checked={column.getIsVisible()}
									onCheckedChange={(value) => column.toggleVisibility(!!value)}
								>
									{rotuloColuna(column)}
								</DropdownMenuCheckboxItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{mostrarSkeleton ? (
				<div className="rounded-md border">
					<TableSkeleton columns={quantidadeColunasVisiveis || 7} rows={8}>
						{colunasVisiveis.map((coluna) => (
							<TableHead
								key={coluna.id}
								className={coluna.id === "acoes" ? "w-12" : undefined}
							>
								{rotuloColuna(coluna)}
							</TableHead>
						))}
					</TableSkeleton>
				</div>
			) : (
				<>
					<div className="rounded-md border overflow-x-auto">
						<Table>
							<TableHeader>
								{tabela.getHeaderGroups().map((headerGroup) => (
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
								{tabela.getRowModel().rows.length > 0 ? (
									tabela.getRowModel().rows.map((row) => (
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
											colSpan={quantidadeColunasVisiveis}
											className="h-32 text-center text-muted-foreground"
										>
											{comFiltros
												? "Nenhuma ordem encontrada para os filtros selecionados."
												: "Nenhuma ordem de serviço encontrada."}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between gap-2">
							<p className="text-sm text-muted-foreground">
								Página {page} de {totalPages} · {totalRegistros} registro(s)
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => onPageChange(Math.max(1, page - 1))}
								>
									Anterior
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages}
									onClick={() => onPageChange(page + 1)}
								>
									Próxima
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
