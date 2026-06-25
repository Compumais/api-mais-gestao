"use client";

import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { TableSkeleton } from "@/components/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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
	estoqueGestaoService,
	type SaldoEstoqueGestao,
} from "@/services/estoque-gestao.service";
import { PageContainer } from "../components/page-container";

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

const TIPO_ESTOQUE_LABEL: Record<number, string> = {
	0: "Operacional",
	1: "Fiscal",
	2: "Ambos",
};

export default function EstoquePage() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const [busca, setBusca] = useState("");
	const [buscaAplicada, setBuscaAplicada] = useState("");
	const [somenteDivergencia, setSomenteDivergencia] = useState(false);
	const [page, setPage] = useState(1);
	const [produtoSelecionado, setProdutoSelecionado] =
		useState<SaldoEstoqueGestao | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: [
			"estoque-saldos",
			idempresa,
			buscaAplicada,
			somenteDivergencia,
			page,
		],
		queryFn: () =>
			estoqueGestaoService.listarSaldos({
				idempresa,
				busca: buscaAplicada || undefined,
				somenteDivergencia,
				page,
				limit: 20,
			}),
		enabled: !!idempresa,
	});

	const { data: movimentosData, isLoading: carregandoMovimentos } = useQuery({
		queryKey: [
			"estoque-movimentos",
			idempresa,
			produtoSelecionado?.codigoproduto,
		],
		queryFn: () =>
			estoqueGestaoService.listarMovimentos({
				idempresa,
				codigoproduto: produtoSelecionado?.codigoproduto ?? undefined,
				page: 1,
				limit: 50,
			}),
		enabled: !!idempresa && !!produtoSelecionado?.codigoproduto,
	});

	const columns = useMemo<ColumnDef<SaldoEstoqueGestao>[]>(
		() => [
			{
				accessorKey: "codigoproduto",
				header: "Código",
				cell: ({ row }) => row.original.codigoproduto ?? "-",
			},
			{
				accessorKey: "nomeproduto",
				header: "Produto",
				cell: ({ row }) => row.original.nomeproduto ?? "-",
			},
			{
				accessorKey: "quantidade",
				header: "Operacional",
				cell: ({ row }) => formatarQuantidade(row.original.quantidade),
			},
			{
				accessorKey: "quantidadefiscal",
				header: "Fiscal",
				cell: ({ row }) => formatarQuantidade(row.original.quantidadefiscal),
			},
			{
				accessorKey: "divergencia",
				header: "Divergência",
				cell: ({ row }) => {
					const div = Number.parseFloat(row.original.divergencia ?? "0");
					const destacar = !Number.isNaN(div) && div !== 0;
					return (
						<span className={destacar ? "font-medium text-amber-600" : ""}>
							{formatarQuantidade(row.original.divergencia)}
						</span>
					);
				},
			},
			{
				id: "acoes",
				header: "",
				cell: ({ row }) => (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setProdutoSelecionado(row.original)}
					>
						Movimentos
					</Button>
				),
			},
		],
		[],
	);

	const table = useReactTable({
		data: data?.data ?? [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	const totalPages = data?.paginacao.totalPages ?? 1;

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4">
					<h1 className="text-2xl font-bold">Estoque</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Saldo operacional (real) e fiscal por produto
					</p>
				</div>

			<div className="flex flex-col gap-4 px-4 mb-2">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
					<div className="flex-1">
						<Label htmlFor="busca-estoque">Buscar produto</Label>
						<div className="relative mt-1">
							<IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="busca-estoque"
								className="pl-9"
								placeholder="Nome ou código"
								value={busca}
								onChange={(e) => setBusca(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										setBuscaAplicada(busca);
										setPage(1);
									}
								}}
							/>
						</div>
					</div>
					<Button
						onClick={() => {
							setBuscaAplicada(busca);
							setPage(1);
						}}
					>
						Buscar
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<Checkbox
						id="somente-divergencia"
						checked={somenteDivergencia}
						onCheckedChange={(v) => {
							setSomenteDivergencia(v === true);
							setPage(1);
						}}
					/>
					<Label htmlFor="somente-divergencia" className="font-normal">
						Somente produtos com divergência entre operacional e fiscal
					</Label>
				</div>
			</div>

			{isLoading ? (
				<TableSkeleton columns={6} rows={8} />
			) : (
				<div className="rounded-lg border mx-4">
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
									<TableCell colSpan={6} className="h-24 text-center">
										Nenhum saldo encontrado
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
			)}

			<div className="flex items-center justify-between mt-4 px-4">
				<p className="text-sm text-muted-foreground">
					Página {page} de {totalPages}
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						Anterior
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => p + 1)}
					>
						Próxima
					</Button>
				</div>
			</div>

			<Sheet
				open={!!produtoSelecionado}
				onOpenChange={(open) => !open && setProdutoSelecionado(null)}
			>
				<SheetContent className="sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{produtoSelecionado?.nomeproduto}</SheetTitle>
						<SheetDescription>
							Código {produtoSelecionado?.codigoproduto ?? "-"} · Histórico de
							movimentos (últimos registros da empresa)
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-3">
						{carregandoMovimentos ? (
							<p className="text-sm text-muted-foreground">Carregando...</p>
						) : (
							(movimentosData?.data ?? []).map((mov) => (
								<div key={mov.id} className="rounded border p-3 text-sm">
									<div className="flex items-center justify-between gap-2">
										<span className="font-medium">
											{mov.quantidadesaida
												? `Saída ${formatarQuantidade(mov.quantidadesaida)}`
												: `Entrada ${formatarQuantidade(mov.quantidadeentrada)}`}
										</span>
										<Badge variant="outline">
											{TIPO_ESTOQUE_LABEL[mov.tipoestoque ?? 0] ?? "—"}
										</Badge>
									</div>
									<p className="text-muted-foreground mt-1">
										{mov.datahora ?? mov.data ?? "—"}
									</p>
								</div>
							))
						)}
					</div>
				</SheetContent>
			</Sheet>
			</div>
		</PageContainer>
	);
}
