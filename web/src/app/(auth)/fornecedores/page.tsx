"use client";

import {
	IconChevronDown,
	IconDotsVertical,
	IconLayoutColumns,
	IconPencil,
	IconPlus,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import type { OrdenacaoColunaTabela } from "@/components/cabecalho-coluna-tabela";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	TABELA_FORNECEDORES,
	useColunasTabelaPersistidas,
} from "@/hooks/use-preferencias-ui-usuario";
import {
	type Entidade,
	entidadesService,
} from "@/services/entidades.service";
import { PageContainer } from "../components/page-container";
import {
	COLUNA_PARA_CAMPO_FILTRO_FORNECEDOR,
	type ConfigFiltroColunaFornecedor,
	criarColunasFornecedores,
	type FiltrosColunaFornecedoresState,
	filtrosColunaFornecedoresVazios,
	INDIEEDEST_OPCOES_FILTRO,
	TIPOPESSOA_OPCOES_FILTRO,
	visibilidadePadraoColunasFornecedores,
} from "./fornecedores-colunas";

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

function filtrosColunaAtivos(filtros: FiltrosColunaFornecedoresState) {
	return Object.values(filtros).some((valor) => valor.trim() !== "");
}

export default function FornecedoresPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { localStorageEmpresa } = useEmpresa();
	const idPorPagina = useId();
	const qAplicado = searchParams.get("q")?.trim() ?? "";
	const [qInput, setQInput] = useState(qAplicado);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filtrosColuna, setFiltrosColuna] =
		useState<FiltrosColunaFornecedoresState>(filtrosColunaFornecedoresVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);

	const visibilidadePadrao = useMemo(
		() => visibilidadePadraoColunasFornecedores(),
		[],
	);
	const { columnVisibility, onColumnVisibilityChange, isLoadingPreferencias } =
		useColunasTabelaPersistidas(TABELA_FORNECEDORES, visibilidadePadrao);

	useEffect(() => {
		setQInput(qAplicado);
	}, [qAplicado]);

	const handleBuscar = () => {
		const termo = qInput.trim();
		setPagination((p) => ({ ...p, pageIndex: 0 }));

		const params = new URLSearchParams();
		if (termo) {
			params.set("q", termo);
		}

		const query = params.toString();
		router.replace(query ? `/fornecedores?${query}` : "/fornecedores");
	};

	const onOrdenarColuna = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaTabela) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId);
				setOrdem(direcao);
			}
			setPagination((p) => ({ ...p, pageIndex: 0 }));
		},
		[],
	);

	const onFiltrarColuna = useCallback((colunaId: string, valor: string) => {
		const campo = COLUNA_PARA_CAMPO_FILTRO_FORNECEDOR[colunaId];
		if (!campo) return;
		setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }));
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	}, []);

	const configFiltroPorColuna = useMemo((): Record<
		string,
		ConfigFiltroColunaFornecedor
	> => {
		const texto = (placeholder?: string): ConfigFiltroColunaFornecedor => ({
			tipo: "texto",
			placeholder,
		});
		return {
			nome: texto("Nome do fornecedor"),
			razaosocial: texto("Razão social"),
			cnpjcpf: texto("CNPJ ou CPF"),
			endereco: texto("Endereço"),
			tipopessoa: {
				tipo: "opcoes",
				opcoes: TIPOPESSOA_OPCOES_FILTRO,
			},
			indiedest: {
				tipo: "opcoes",
				opcoes: INDIEEDEST_OPCOES_FILTRO,
			},
			inscricaoestadual: texto("Inscrição estadual"),
			rg: texto("RG"),
			email: texto("E-mail"),
			telefone: texto("Telefone"),
			numeroendereco: texto("Número"),
			complemento: texto("Complemento"),
			bairro: texto("Bairro"),
			cep: texto("CEP"),
			fax: texto("Fax"),
			nascimento: { tipo: "data" },
			pais: texto("País"),
			criadoem: { tipo: "data" },
		};
	}, []);

	const { data, isLoading } = useQuery({
		queryKey: [
			"fornecedores",
			localStorageEmpresa?.id,
			qAplicado,
			pagination.pageIndex + 1,
			pagination.pageSize,
			filtrosColuna,
			ordenarPor,
			ordem,
		],
		queryFn: async () => {
			if (!localStorageEmpresa) {
				throw new Error("Empresa não selecionada");
			}
			return await entidadesService.listar({
				idempresa: localStorageEmpresa.id,
				fornecedor: 1,
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(qAplicado ? { q: qAplicado } : {}),
				...(filtrosColuna.nome ? { nome: filtrosColuna.nome } : {}),
				...(filtrosColuna.razaosocial
					? { razaosocial: filtrosColuna.razaosocial }
					: {}),
				...(filtrosColuna.cnpjcpf ? { cnpjcpf: filtrosColuna.cnpjcpf } : {}),
				...(filtrosColuna.endereco
					? { endereco: filtrosColuna.endereco }
					: {}),
				...(filtrosColuna.tipopessoa !== ""
					? { tipopessoa: Number(filtrosColuna.tipopessoa) }
					: {}),
				...(filtrosColuna.indiedest !== ""
					? { indiedest: Number(filtrosColuna.indiedest) }
					: {}),
				...(filtrosColuna.inscricaoestadual
					? { inscricaoestadual: filtrosColuna.inscricaoestadual }
					: {}),
				...(filtrosColuna.rg ? { rg: filtrosColuna.rg } : {}),
				...(filtrosColuna.email ? { email: filtrosColuna.email } : {}),
				...(filtrosColuna.telefone
					? { telefone: filtrosColuna.telefone }
					: {}),
				...(filtrosColuna.numeroendereco
					? { numeroendereco: filtrosColuna.numeroendereco }
					: {}),
				...(filtrosColuna.complemento
					? { complemento: filtrosColuna.complemento }
					: {}),
				...(filtrosColuna.bairro ? { bairro: filtrosColuna.bairro } : {}),
				...(filtrosColuna.cep ? { cep: filtrosColuna.cep } : {}),
				...(filtrosColuna.fax ? { fax: filtrosColuna.fax } : {}),
				...(filtrosColuna.nascimento
					? { nascimento: filtrosColuna.nascimento }
					: {}),
				...(filtrosColuna.pais ? { pais: filtrosColuna.pais } : {}),
				...(filtrosColuna.criadoem
					? { criadoem: filtrosColuna.criadoem }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			});
		},
		enabled: !!localStorageEmpresa,
	});

	const { mutate: deletarEntidade } = useMutation({
		mutationFn: entidadesService.deletar,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
			toast.success("Fornecedor excluído com sucesso!");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao excluir fornecedor");
		},
	});

	const handleEdit = useCallback(
		(entidade: Entidade) => {
			router.push(`/fornecedores/${entidade.id}/editar`);
		},
		[router],
	);

	const handleDelete = useCallback(
		(id: string) => {
			toast.message("Tem certeza que deseja excluir este fornecedor?", {
				position: "top-center",
				duration: 3000,
				action: {
					label: "Excluir",
					onClick: () => deletarEntidade(id),
				},
				description: "Esta ação não pode ser desfeita.",
			});
		},
		[deletarEntidade],
	);

	const columns = useMemo(
		() =>
			criarColunasFornecedores({
				filtros: filtrosColuna,
				ordenarPor,
				ordem,
				onOrdenarColuna,
				onFiltrarColuna,
				configFiltroPorColuna,
				renderAcoes: (entidade) => (
					<div className="flex justify-end">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									aria-label="Abrir menu de ações"
								>
									<IconDotsVertical className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => handleEdit(entidade)}>
									<IconPencil className="size-4" />
									Editar
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => handleDelete(entidade.id)}
								>
									<IconTrash className="size-4" />
									Excluir
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				),
			}),
		[
			filtrosColuna,
			ordenarPor,
			ordem,
			onOrdenarColuna,
			onFiltrarColuna,
			configFiltroPorColuna,
			handleEdit,
			handleDelete,
		],
	);

	const table = useReactTable({
		data: data?.data || [],
		columns,
		state: {
			pagination,
			columnVisibility,
		},
		onPaginationChange: setPagination,
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
	});

	const colunasVisiveis = table.getVisibleLeafColumns();
	const mostrarSkeleton = isLoading || isLoadingPreferencias;
	const comFiltros =
		!!qAplicado || filtrosColunaAtivos(filtrosColuna) || !!ordenarPor;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between px-4">
					<h1 className="text-2xl font-bold">Fornecedores</h1>
					<Button
						onClick={() => router.push("/fornecedores/novo")}
						className="gap-2"
						disabled={!localStorageEmpresa}
					>
						<IconPlus className="size-4" />
						Cadastrar Novo Fornecedor
					</Button>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<div className="flex gap-2">
						<Input
							value={qInput}
							onChange={(event) => setQInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									handleBuscar();
								}
							}}
							placeholder="Buscar por nome, razão social ou CNPJ/CPF..."
							disabled={!localStorageEmpresa}
							className="max-w-md"
						/>
						<Button
							onClick={handleBuscar}
							disabled={!localStorageEmpresa}
							className="gap-2"
						>
							<IconSearch className="size-4" />
							Buscar
						</Button>
					</div>
					{localStorageEmpresa && (
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
								{table
									.getAllColumns()
									.filter((column) => column.getCanHide())
									.map((column) => (
										<DropdownMenuCheckboxItem
											key={column.id}
											checked={column.getIsVisible()}
											onCheckedChange={(value) =>
												column.toggleVisibility(!!value)
											}
										>
											{rotuloColuna(column)}
										</DropdownMenuCheckboxItem>
									))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
				<div className="mx-4 rounded-lg border bg-card">
					{!localStorageEmpresa ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">
								Selecione uma empresa para visualizar os fornecedores
							</p>
						</div>
					) : mostrarSkeleton ? (
						<TableSkeleton columns={colunasVisiveis.length || 5} rows={10}>
							{colunasVisiveis.map((coluna) => (
								<TableHead
									key={coluna.id}
									className={
										coluna.id === "acoes" ? "w-12 text-end" : undefined
									}
								>
									{rotuloColuna(coluna)}
								</TableHead>
							))}
						</TableSkeleton>
					) : (
						<>
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<TableHead
													className={header.id === "acoes" ? "text-right" : ""}
													key={header.id}
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
									{table.getRowModel().rows?.length ? (
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
												colSpan={colunasVisiveis.length}
												className="h-24 text-center"
											>
												{comFiltros
													? "Nenhum fornecedor encontrado para os filtros selecionados."
													: "Nenhum fornecedor encontrado."}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{data && data.paginacao.total > 0 && (
								<div className="flex flex-col gap-4 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Label htmlFor={idPorPagina} className="text-sm">
											Itens por página
										</Label>
										<Select
											value={`${pagination.pageSize}`}
											onValueChange={(value) => {
												table.setPageSize(Number(value));
												table.setPageIndex(0);
											}}
										>
											<SelectTrigger id={idPorPagina} className="h-8 w-[72px]">
												<SelectValue placeholder={pagination.pageSize} />
											</SelectTrigger>
											<SelectContent side="top">
												{[10, 20, 30, 50, 100].map((tamanho) => (
													<SelectItem key={tamanho} value={`${tamanho}`}>
														{tamanho}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="text-sm text-muted-foreground">
										Página {pagination.pageIndex + 1} de{" "}
										{data.paginacao.totalPages} ({data.paginacao.total}{" "}
										registros)
									</div>
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
