"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	CabecalhoColunaTabela,
	type OrdenacaoColunaTabela,
} from "@/components/cabecalho-coluna-tabela";
import { Button } from "@/components/ui/button";
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
import { hierarquiasService } from "@/services/hierarquias.service";
import { type Produto, produtosService } from "@/services/produtos.service";

type FiltrosVariacao = {
	codigo: string;
	nome: string;
	ean: string;
	unidademedida: string;
	preco: string;
	custoaquisicao: string;
};

const filtrosVazios: FiltrosVariacao = {
	codigo: "",
	nome: "",
	ean: "",
	unidademedida: "",
	preco: "",
	custoaquisicao: "",
};

function formatarPreco(preco: string | null | undefined) {
	if (!preco) return "-";
	const numero = Number.parseFloat(preco);
	if (Number.isNaN(numero)) return "-";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

function formatarQuantidade(valor: string | null | undefined) {
	const numero = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(numero)) return "0";
	return numero.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

type ProdutoAbaVariacoesProps = {
	produtoId: string;
	idempresa: string;
};

export function ProdutoAbaVariacoes({
	produtoId,
	idempresa,
}: ProdutoAbaVariacoesProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const idBusca = useId();
	const idPorPagina = useId();
	const [qInput, setQInput] = useState("");
	const [qAplicado, setQAplicado] = useState("");
	const [filtros, setFiltros] = useState<FiltrosVariacao>(filtrosVazios);
	const [ordenarPor, setOrdenarPor] = useState<string | null>(null);
	const [ordem, setOrdem] = useState<"asc" | "desc" | null>(null);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});

	const { data: gruposData } = useQuery({
		queryKey: ["hierarquias", idempresa, "variacoes"],
		queryFn: () =>
			hierarquiasService.listar({
				idempresa,
				limit: 100,
			}),
	});
	const nomeGrupo = useMemo(() => {
		const mapa = new Map<string, string>();
		for (const grupo of gruposData?.data ?? []) {
			mapa.set(grupo.id, grupo.nome ?? grupo.codigo ?? grupo.id);
		}
		return mapa;
	}, [gruposData]);

	const { data, isLoading, isError } = useQuery({
		queryKey: [
			"produtos",
			"variacoes",
			produtoId,
			idempresa,
			qAplicado,
			filtros,
			ordenarPor,
			ordem,
			pagination.pageIndex,
			pagination.pageSize,
		],
		queryFn: () =>
			produtosService.listar({
				idempresa,
				idprodutopai: produtoId,
				tipo: "P",
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				...(qAplicado ? { q: qAplicado } : {}),
				...(filtros.codigo ? { codigo: filtros.codigo } : {}),
				...(filtros.nome ? { nome: filtros.nome } : {}),
				...(filtros.ean ? { ean: filtros.ean } : {}),
				...(filtros.unidademedida
					? { unidademedida: filtros.unidademedida }
					: {}),
				...(filtros.preco ? { preco: filtros.preco } : {}),
				...(filtros.custoaquisicao
					? { custoaquisicao: filtros.custoaquisicao }
					: {}),
				...(ordenarPor ? { ordenarPor } : {}),
				...(ordem ? { ordem } : {}),
			}),
	});

	const inativar = useMutation({
		mutationFn: async (produto: Produto) =>
			produtosService.inativar(
				produto.id,
				produto.inativo === 1 ? 0 : 1,
				idempresa,
			),
		onSuccess: (_resultado, produto) => {
			queryClient.invalidateQueries({ queryKey: ["produtos"] });
			toast.success(
				produto.inativo === 1
					? "Variação reativada com sucesso!"
					: "Variação inativada com sucesso!",
			);
		},
		onError: (erro: Error) => {
			toast.error(erro.message || "Não foi possível alterar a variação");
		},
	});

	const onOrdenar = useCallback(
		(colunaId: string, direcao: OrdenacaoColunaTabela) => {
			if (!direcao) {
				setOrdenarPor(null);
				setOrdem(null);
			} else {
				setOrdenarPor(colunaId);
				setOrdem(direcao);
			}
			setPagination((atual) => ({ ...atual, pageIndex: 0 }));
		},
		[],
	);

	const onFiltrar = useCallback((colunaId: string, valor: string) => {
		if (!(colunaId in filtrosVazios)) return;
		setFiltros((atual) => ({ ...atual, [colunaId]: valor }));
		setPagination((atual) => ({ ...atual, pageIndex: 0 }));
	}, []);

	const colunas = useMemo<ColumnDef<Produto>[]>(() => {
		function cabecalho(id: keyof FiltrosVariacao, titulo: string) {
			return (
				<CabecalhoColunaTabela
					titulo={titulo}
					colunaId={id}
					ordenacao={ordenarPor === id ? (ordem ?? false) : false}
					onOrdenar={(direcao) => onOrdenar(id, direcao)}
					filtroAtivo={filtros[id].trim() !== ""}
					valorFiltro={filtros[id]}
					onFiltrar={(valor) => onFiltrar(id, valor)}
				/>
			);
		}

		return [
			{
				accessorKey: "codigo",
				header: () => cabecalho("codigo", "Código"),
				cell: ({ row }) => row.original.codigo ?? "-",
			},
			{
				accessorKey: "nome",
				header: () => cabecalho("nome", "Nome"),
				cell: ({ row }) => row.original.nome,
			},
			{
				accessorKey: "ean",
				header: () => cabecalho("ean", "Cód. barras"),
				cell: ({ row }) => row.original.ean ?? "-",
			},
			{
				accessorKey: "unidademedida",
				header: () => cabecalho("unidademedida", "Unidade"),
				cell: ({ row }) => row.original.unidademedida ?? "-",
			},
			{
				accessorKey: "preco",
				header: () => cabecalho("preco", "Preço"),
				cell: ({ row }) => formatarPreco(row.original.preco),
			},
			{
				accessorKey: "custoaquisicao",
				header: () => cabecalho("custoaquisicao", "Custo"),
				cell: ({ row }) => formatarPreco(row.original.custoaquisicao),
			},
			{
				id: "quantidade",
				header: () => (
					<CabecalhoColunaTabela
						titulo="Estoque"
						colunaId="quantidade"
						ordenacao={
							ordenarPor === "quantidade" ? (ordem ?? false) : false
						}
						onOrdenar={(direcao) => onOrdenar("quantidade", direcao)}
						filtroAtivo={false}
						valorFiltro=""
						onFiltrar={() => undefined}
						tipoFiltro="nenhum"
					/>
				),
				cell: ({ row }) => formatarQuantidade(row.original.quantidade),
			},
			{
				id: "grupo",
				header: "Grupo",
				cell: ({ row }) =>
					row.original.idgrupo
						? (nomeGrupo.get(row.original.idgrupo) ?? "-")
						: "-",
			},
			{
				id: "acoes",
				header: () => <span className="sr-only">Ações</span>,
				cell: ({ row }) => (
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() =>
								router.push(`/produtos/${row.original.id}/editar`)
							}
						>
							Editar
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={inativar.isPending}
							onClick={() => inativar.mutate(row.original)}
						>
							{row.original.inativo === 1 ? "Reativar" : "Inativar"}
						</Button>
					</div>
				),
			},
		];
	}, [
		filtros,
		inativar.isPending,
		inativar.mutate,
		nomeGrupo,
		onFiltrar,
		onOrdenar,
		ordem,
		ordenarPor,
		router,
	]);

	const table = useReactTable({
		data: data?.data ?? [],
		columns: colunas,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: data?.paginacao.totalPages ?? 0,
		state: { pagination },
		onPaginationChange: setPagination,
		getRowId: (row) => row.id,
	});

	const total = data?.paginacao.total ?? 0;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-1 flex-col gap-2 sm:max-w-md">
					<Label htmlFor={idBusca}>Buscar variação</Label>
					<div className="flex gap-2">
						<Input
							id={idBusca}
							value={qInput}
							placeholder="Nome, código ou código de barras"
							onChange={(evento) => setQInput(evento.target.value)}
							onKeyDown={(evento) => {
								if (evento.key !== "Enter") return;
								evento.preventDefault();
								setQAplicado(qInput.trim());
								setPagination((atual) => ({ ...atual, pageIndex: 0 }));
							}}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setQAplicado(qInput.trim());
								setPagination((atual) => ({ ...atual, pageIndex: 0 }));
							}}
						>
							<Search className="mr-2 h-4 w-4" aria-hidden="true" />
							Buscar
						</Button>
					</div>
				</div>
				<Button
					type="button"
					onClick={() =>
						router.push(`/produtos/novo?variacaoDe=${produtoId}`)
					}
				>
					<Plus className="mr-2 h-4 w-4" aria-hidden="true" />
					Nova variação
				</Button>
			</div>

			<div className="rounded-lg border">
				{isLoading ? (
					<p className="p-6 text-sm text-muted-foreground">
						Carregando variações...
					</p>
				) : isError ? (
					<p className="p-6 text-sm text-destructive">
						Não foi possível carregar as variações.
					</p>
				) : (
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((grupo) => (
								<TableRow key={grupo.id}>
									{grupo.headers.map((header) => (
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
									<TableCell colSpan={colunas.length} className="h-24 text-center">
										Nenhuma variação encontrada.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				)}
				{total > 0 ? (
					<div className="flex flex-col gap-4 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<Label htmlFor={idPorPagina} className="text-sm">
								Itens por página
							</Label>
							<Select
								value={`${pagination.pageSize}`}
								onValueChange={(valor) => {
									setPagination({
										pageIndex: 0,
										pageSize: Number(valor),
									});
								}}
							>
								<SelectTrigger id={idPorPagina} className="h-8 w-[72px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[10, 20, 50, 100].map((tamanho) => (
										<SelectItem key={tamanho} value={`${tamanho}`}>
											{tamanho}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<p className="text-sm text-muted-foreground">
							Página {pagination.pageIndex + 1} de{" "}
							{data?.paginacao.totalPages ?? 1} ({total} registros)
						</p>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								Anterior
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								Próxima
							</Button>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
