"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Star, Trash2, Warehouse } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { localEstoqueService } from "@/services/local-estoque.service";

const POSSE_LABELS: Record<string, string> = {
	P: "Próprio",
	T: "De terceiros",
	E: "Em terceiros",
};

export default function LocaisEstoquePage() {
	const { idempresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [limit] = useState(10);
	const [descricaoFiltro, setDescricaoFiltro] = useState("");
	const [codigoFiltro, setCodigoFiltro] = useState("");
	const [busca, setBusca] = useState<{ descricao?: string; codigo?: string }>(
		{},
	);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["locais-estoque", idempresa, page, limit, busca],
		queryFn: () =>
			localEstoqueService.listar({
				idempresa: idempresa ?? "",
				page,
				limit,
				...busca,
			}),
		enabled: !!idempresa,
	});

	const deletarMutation = useMutation({
		mutationFn: (id: string) => localEstoqueService.deletar(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
			toast.success("Local de estoque excluído com sucesso!");
		},
		onError: (err: unknown) => {
			const msg =
				err &&
				typeof err === "object" &&
				"response" in err &&
				err.response &&
				typeof err.response === "object" &&
				"data" in err.response &&
				err.response.data &&
				typeof err.response.data === "object" &&
				"error" in err.response.data
					? String(err.response.data.error)
					: "Erro ao excluir local de estoque";
			toast.error(msg);
		},
	});

	const padraoMutation = useMutation({
		mutationFn: (id: string) => localEstoqueService.definirPadrao(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
			toast.success("Local de estoque padrão atualizado!");
		},
		onError: () => {
			toast.error("Erro ao definir local de estoque padrão");
		},
	});

	function handleBuscar() {
		setPage(1);
		setBusca({
			...(descricaoFiltro && { descricao: descricaoFiltro }),
			...(codigoFiltro && { codigo: codigoFiltro }),
		});
	}

	function handleLimpar() {
		setDescricaoFiltro("");
		setCodigoFiltro("");
		setPage(1);
		setBusca({});
	}

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4">
				<div className="flex items-center gap-2">
					<Warehouse className="h-6 w-6 text-muted-foreground" />
					<div>
						<h1 className="text-2xl font-bold">Locais de Estoque</h1>
						<p className="text-sm text-muted-foreground">
							Cadastre os depósitos e locais de armazenamento e defina o local
							padrão da empresa.
						</p>
					</div>
				</div>
				<Button asChild>
					<Link href="/locais-estoque/novo">
						<Plus className="mr-2 h-4 w-4" />
						Novo Local de Estoque
					</Link>
				</Button>
			</div>

			<div className="mx-4 mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4">
				<div className="flex flex-col gap-1">
					<span className="text-sm text-muted-foreground">Código</span>
					<Input
						placeholder="Buscar por código..."
						value={codigoFiltro}
						onChange={(e) => setCodigoFiltro(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
						className="w-44"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-sm text-muted-foreground">Descrição</span>
					<Input
						placeholder="Buscar por descrição..."
						value={descricaoFiltro}
						onChange={(e) => setDescricaoFiltro(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
						className="w-64"
					/>
				</div>
				<Button onClick={handleBuscar}>
					<Search className="mr-2 h-4 w-4" />
					Buscar
				</Button>
				<Button variant="outline" onClick={handleLimpar}>
					Limpar
				</Button>
			</div>

			<div className="mx-4 rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Código</TableHead>
							<TableHead>Descrição</TableHead>
							<TableHead>Posse</TableHead>
							<TableHead>Padrão</TableHead>
							<TableHead>Situação</TableHead>
							<TableHead className="text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }, (_, i) => `skeleton-row-${i}`).map(
								(key) => (
									<TableRow key={key}>
										{Array.from(
											{ length: 6 },
											(_, j) => `skeleton-cell-${key}-${j}`,
										).map((cellKey) => (
											<TableCell key={cellKey}>
												<Skeleton className="h-4 w-full" />
											</TableCell>
										))}
									</TableRow>
								),
							)
						) : isError ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-destructive"
								>
									Erro ao carregar locais de estoque
								</TableCell>
							</TableRow>
						) : data?.data.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground"
								>
									Nenhum local de estoque encontrado
								</TableCell>
							</TableRow>
						) : (
							data?.data.map((local) => {
								const isPadrao = local.padrao === 1;
								return (
									<TableRow key={local.id}>
										<TableCell className="font-mono">
											{local.codigo || "-"}
										</TableCell>
										<TableCell className="font-medium">
											{local.descricao || "-"}
										</TableCell>
										<TableCell>
											{local.posse
												? (POSSE_LABELS[local.posse] ?? local.posse)
												: "Próprio"}
										</TableCell>
										<TableCell>
											{isPadrao ? (
												<Badge className="gap-1">
													<Star className="h-3 w-3 fill-current" />
													Padrão
												</Badge>
											) : (
												<Button
													variant="ghost"
													size="sm"
													disabled={
														padraoMutation.isPending || local.inativo === 1
													}
													onClick={() => padraoMutation.mutate(local.id)}
												>
													<Star className="mr-1 h-3.5 w-3.5" />
													Definir padrão
												</Button>
											)}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													local.inativo === 1 ? "secondary" : "default"
												}
											>
												{local.inativo === 1 ? "Inativo" : "Ativo"}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button variant="ghost" size="icon" asChild>
													<Link href={`/locais-estoque/${local.id}/editar`}>
														<Pencil className="h-4 w-4" />
													</Link>
												</Button>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button variant="ghost" size="icon">
															<Trash2 className="h-4 w-4 text-destructive" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Confirmar exclusão
															</AlertDialogTitle>
															<AlertDialogDescription>
																Tem certeza que deseja excluir o local de
																estoque{" "}
																<strong>
																	{local.descricao ?? local.codigo}
																</strong>
																? Esta ação não pode ser desfeita.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancelar</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	deletarMutation.mutate(local.id)
																}
															>
																Excluir
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>

				{data && data.paginacao.totalPages > 1 && (
					<div className="flex items-center justify-between border-t p-4">
						<span className="text-sm text-muted-foreground">
							Total: {data.paginacao.total} registros — Página{" "}
							{data.paginacao.page} de {data.paginacao.totalPages}
						</span>
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										className={
											page <= 1
												? "pointer-events-none opacity-50"
												: "cursor-pointer"
										}
									/>
								</PaginationItem>
								<PaginationItem>
									<PaginationNext
										onClick={() =>
											setPage((p) =>
												Math.min(data.paginacao.totalPages, p + 1),
											)
										}
										className={
											page >= data.paginacao.totalPages
												? "pointer-events-none opacity-50"
												: "cursor-pointer"
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</div>
		</PageContainer>
	);
}
