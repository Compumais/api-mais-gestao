"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
	formatCurrency,
	formatDate,
	formatDocumento,
	formatParcela,
	getStatusBadge,
} from "@/app/(auth)/components/financeiro-lista-colunas";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Entidade } from "@/services/entidades.service";
import { financeiroService } from "@/services/financeiro.service";

const LIMITE_PAGINA = 20;

type HistoricoClienteModalProps = {
	cliente: Entidade | null;
	onFechar: () => void;
};

function rotuloMeioPagamento(params: {
	tipodocumentodescricao?: string | null;
	nomebandeira?: string | null;
	nomeadministradora?: string | null;
}) {
	const tipo = params.tipodocumentodescricao?.trim();
	const bandeira = params.nomebandeira?.trim();
	const administradora = params.nomeadministradora?.trim();

	if (tipo && bandeira) return `${tipo} · ${bandeira}`;
	if (tipo) return tipo;
	if (bandeira) return bandeira;
	if (administradora) return administradora;
	return "—";
}

export function HistoricoClienteModal({
	cliente,
	onFechar,
}: HistoricoClienteModalProps) {
	const aberto = !!cliente;
	const [page, setPage] = useState(1);

	useEffect(() => {
		if (cliente?.id) setPage(1);
	}, [cliente?.id]);

	const {
		data: comprasData,
		isLoading: carregandoCompras,
		isFetching,
		isError: erroCompras,
		error: erro,
	} = useQuery({
		queryKey: ["historico-cliente", cliente?.id, page],
		queryFn: () =>
			financeiroService.listar({
				identidade: cliente?.id,
				tipo: "R",
				page,
				limit: LIMITE_PAGINA,
				ordenarPor: "emissao",
				ordem: "desc",
			}),
		enabled: aberto && !!cliente?.id,
	});

	const compras = comprasData?.data ?? [];
	const paginacao = comprasData?.paginacao;

	return (
		<Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
			<DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Histórico do cliente</DialogTitle>
					<DialogDescription>
						{cliente?.nome ?? "—"}
						{cliente?.cnpjcpf ? ` · ${cliente.cnpjcpf}` : ""}
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between gap-2">
					<p className="text-xs text-muted-foreground">
						Compras efetuadas, parcelas e contas a receber
					</p>
					{cliente ? (
						<Button asChild size="sm" variant="outline">
							<Link href="/contas-receber">Ver contas a receber</Link>
						</Button>
					) : null}
				</div>

				<div className="min-h-48 overflow-auto">
					{carregandoCompras ? (
						<p className="text-sm text-muted-foreground" aria-live="polite">
							Carregando histórico...
						</p>
					) : erroCompras ? (
						<p className="text-sm text-destructive" role="alert">
							{erro.message}
						</p>
					) : compras.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma compra encontrada para este cliente.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Data</TableHead>
									<TableHead>Documento</TableHead>
									<TableHead>Meio de pagamento</TableHead>
									<TableHead>Parcelas</TableHead>
									<TableHead className="text-right">Valor</TableHead>
									<TableHead>Vencimento</TableHead>
									<TableHead>Situação</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{compras.map((compra) => (
									<TableRow key={compra.id}>
										<TableCell className="whitespace-nowrap">
											{formatDate(compra.emissao)}
										</TableCell>
										<TableCell>
											<Link
												href={`/contas-receber/${compra.id}`}
												className="underline-offset-4 hover:underline"
											>
												{formatDocumento(compra, "receber")}
											</Link>
										</TableCell>
										<TableCell>
											{rotuloMeioPagamento({
												tipodocumentodescricao: compra.tipodocumentodescricao,
												nomebandeira: compra.nomebandeira,
												nomeadministradora: compra.nomeadministradora,
											})}
										</TableCell>
										<TableCell>
											{formatParcela(
												compra.parcela,
												compra.totalparcelas,
												"receber",
											)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(compra.valor)}
										</TableCell>
										<TableCell className="whitespace-nowrap">
											{formatDate(compra.vencimento)}
										</TableCell>
										<TableCell>{getStatusBadge(compra.status)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>

				{paginacao && paginacao.total > 0 ? (
					<div className="flex items-center justify-between gap-2">
						<p className="text-sm text-muted-foreground">
							Página {paginacao.page} de {paginacao.totalPages} (
							{paginacao.total} compra
							{paginacao.total === 1 ? "" : "s"})
						</p>
						{paginacao.totalPages > 1 ? (
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
						) : null}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
