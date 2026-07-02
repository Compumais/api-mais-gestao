"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	type EntradaHistoricoComposicao,
	custoProdutoService,
} from "@/services/custo-produto.service";

type ModalHistoricoComposicaoProps = {
	idproduto: string;
	nomeProduto: string;
	aberto: boolean;
	onAbertoChange: (aberto: boolean) => void;
};

const ORIGEM_LABEL: Record<number, string> = {
	0: "NF de compra",
	1: "Manual",
	2: "Produção",
};

function formatarMoeda(valor: string | number | null | undefined): string {
	const numero = Number.parseFloat(String(valor ?? "0"));
	if (Number.isNaN(numero)) return "R$ 0,00";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(numero);
}

function formatarData(data: string | null | undefined): string {
	if (!data) return "—";
	return new Date(data).toLocaleDateString("pt-BR");
}

function obterLabelOrigem(origem: number | null): string {
	if (origem === null || origem === undefined) return "—";
	return ORIGEM_LABEL[origem] ?? `Origem ${origem}`;
}

function obterFornecedorOuOrigem(entrada: EntradaHistoricoComposicao): string {
	if (entrada.razaosocial) return entrada.razaosocial;
	return obterLabelOrigem(entrada.origem);
}

export function ModalHistoricoComposicao({
	idproduto,
	nomeProduto,
	aberto,
	onAbertoChange,
}: ModalHistoricoComposicaoProps) {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, isFetching } = useQuery({
		queryKey: ["historico-composicao", idproduto, page],
		queryFn: () =>
			custoProdutoService.listarHistoricoComposicao({
				idproduto,
				page,
				limit,
			}),
		enabled: aberto && !!idproduto,
	});

	const paginacao = data?.paginacao;
	const entradas = data?.data ?? [];

	return (
		<Sheet open={aberto} onOpenChange={onAbertoChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-4xl"
			>
				<SheetHeader className="border-b px-6 py-4">
					<SheetTitle>Histórico de composição</SheetTitle>
					<SheetDescription>{nomeProduto}</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-4">
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Carregando histórico...</p>
					) : entradas.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma composição registrada para este produto.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Data</TableHead>
									<TableHead>Fornecedor / Origem</TableHead>
									<TableHead>Usuário</TableHead>
									<TableHead>NF</TableHead>
									<TableHead className="text-right">Preço compra</TableHead>
									<TableHead className="text-right">Custo aquisição</TableHead>
									<TableHead className="text-right">Custo compra</TableHead>
									<TableHead className="text-right">Custo médio</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{entradas.map((entrada) => (
									<TableRow key={entrada.id}>
										<TableCell className="whitespace-nowrap">
											{formatarData(entrada.datahora)}
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-1">
												<span className="max-w-[12rem] truncate text-sm">
													{obterFornecedorOuOrigem(entrada)}
												</span>
												{entrada.origem !== null ? (
													<Badge variant="outline" className="w-fit text-xs">
														{obterLabelOrigem(entrada.origem)}
													</Badge>
												) : null}
											</div>
										</TableCell>
										<TableCell>
											{entrada.nomeusuario ?? "—"}
										</TableCell>
										<TableCell>
											{entrada.numeronotafiscal ?? "—"}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatarMoeda(entrada.precocompra)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatarMoeda(entrada.custoaquisicao)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatarMoeda(entrada.custo)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatarMoeda(entrada.customedio)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>

				{paginacao && paginacao.totalPages > 1 ? (
					<div className="flex items-center justify-between border-t px-6 py-4">
						<p className="text-sm text-muted-foreground">
							Página {paginacao.page} de {paginacao.totalPages}
						</p>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page <= 1 || isFetching}
								onClick={() => setPage((atual) => Math.max(1, atual - 1))}
							>
								Anterior
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page >= paginacao.totalPages || isFetching}
								onClick={() =>
									setPage((atual) =>
										Math.min(paginacao.totalPages, atual + 1),
									)
								}
							>
								Próxima
							</Button>
						</div>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
