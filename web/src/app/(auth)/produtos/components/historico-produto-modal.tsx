"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { formatDataCivilBrasilia, formatDateTimeBrasilia } from "@/lib/date";
import {
	estoqueGestaoService,
	type MovimentoEstoqueGestao,
} from "@/services/estoque-gestao.service";
import type { Produto } from "@/services/produtos.service";

const LIMITE_PAGINA = 20;

const TIPO_DOCUMENTO_LABEL: Record<number, string> = {
	0: "PDV",
	1: "Nota fiscal",
	2: "Acerto",
	3: "Produção",
};

const TIPO_ESTOQUE_LABEL: Record<number, string> = {
	0: "Operacional",
	1: "Fiscal",
	2: "Ambos",
};

type HistoricoProdutoModalProps = {
	produto: Produto | null;
	idempresa: string;
	onFechar: () => void;
};

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function formatarMoeda(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "");
	if (!valor || Number.isNaN(n)) return "—";
	return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ehSaida(movimento: MovimentoEstoqueGestao) {
	return Number.parseFloat(movimento.quantidadesaida ?? "0") > 0;
}

function rotuloTipo(movimento: MovimentoEstoqueGestao) {
	const saida = ehSaida(movimento);
	if (movimento.tipodocumento === 0) return "Venda";
	if (movimento.tipodocumento === 1) return saida ? "Venda" : "Compra";
	if (movimento.tipodocumento === 2) return saida ? "Saída" : "Entrada";
	if (movimento.tipodocumento === 3) return saida ? "Saída" : "Entrada";
	return saida ? "Saída" : "Entrada";
}

function rotuloDocumento(movimento: MovimentoEstoqueGestao) {
	if (movimento.documentoNumero) {
		const serie = movimento.documentoSerie
			? `/${movimento.documentoSerie}`
			: "";
		const modelo = movimento.documentoModelo
			? ` mod. ${movimento.documentoModelo}`
			: "";
		return `NF ${movimento.documentoNumero}${serie}${modelo}`;
	}

	if (movimento.numeropdv != null) {
		const local = movimento.idvendalocal ? ` · ${movimento.idvendalocal}` : "";
		return `PDV ${movimento.numeropdv}${local}`;
	}

	if (movimento.observacao) return movimento.observacao;
	if (movimento.tipodocumento != null) {
		return TIPO_DOCUMENTO_LABEL[movimento.tipodocumento] ?? "—";
	}
	return "—";
}

function rotuloQuantidade(movimento: MovimentoEstoqueGestao) {
	if (ehSaida(movimento)) {
		return `−${formatarQuantidade(movimento.quantidadesaida)}`;
	}
	return `+${formatarQuantidade(movimento.quantidadeentrada)}`;
}

export function HistoricoProdutoModal({
	produto,
	idempresa,
	onFechar,
}: HistoricoProdutoModalProps) {
	const aberto = !!produto;
	const [page, setPage] = useState(1);
	const codigoProduto =
		produto?.codigo != null ? String(produto.codigo) : undefined;

	useEffect(() => {
		if (aberto) setPage(1);
	}, [aberto, produto?.id]);

	const {
		data: movimentosData,
		isLoading: carregandoMovimentos,
		isFetching,
		isError: erroMovimentos,
		error: erro,
	} = useQuery({
		queryKey: ["estoque-movimentos", idempresa, produto?.id, page],
		queryFn: () =>
			estoqueGestaoService.listarMovimentos({
				idempresa,
				idproduto: produto?.id,
				page,
				limit: LIMITE_PAGINA,
			}),
		enabled: aberto && !!idempresa && !!produto?.id,
	});

	const { data: saldoData } = useQuery({
		queryKey: ["estoque-saldos-historico", idempresa, codigoProduto],
		queryFn: () =>
			estoqueGestaoService.listarSaldos({
				idempresa,
				codigoproduto: codigoProduto,
				page: 1,
				limit: 1,
			}),
		enabled: aberto && !!idempresa && !!codigoProduto,
	});

	const movimentos = movimentosData?.data ?? [];
	const paginacao = movimentosData?.paginacao;
	const saldo = saldoData?.data[0];

	return (
		<Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
			<DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Histórico do produto</DialogTitle>
					<DialogDescription>
						{produto?.nome ?? "—"}
						{codigoProduto ? ` · Código ${codigoProduto}` : ""}
						{saldo?.possuiSaldo
							? ` · Saldo ${formatarQuantidade(saldo.quantidade)} (fiscal ${formatarQuantidade(saldo.quantidadefiscal)})`
							: ""}
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between gap-2">
					<p className="text-xs text-muted-foreground">
						Compras, vendas e demais movimentos de estoque
					</p>
					{produto ? (
						<Button asChild size="sm" variant="outline">
							<Link
								href={`/produtos/relatorios/movimentacoes?q=${encodeURIComponent(
									codigoProduto ?? produto.nome,
								)}`}
							>
								Ver kardex completo
							</Link>
						</Button>
					) : null}
				</div>

				<div className="min-h-48 overflow-auto">
					{carregandoMovimentos ? (
						<p className="text-sm text-muted-foreground" aria-live="polite">
							Carregando histórico...
						</p>
					) : erroMovimentos ? (
						<p className="text-sm text-destructive" role="alert">
							{erro.message}
						</p>
					) : movimentos.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Nenhuma compra ou venda encontrada para este produto.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Data</TableHead>
									<TableHead>Documento</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead className="text-right">Quantidade</TableHead>
									<TableHead className="text-right">Valor</TableHead>
									<TableHead>CFOP</TableHead>
									<TableHead>Estoque</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{movimentos.map((movimento) => {
									const saida = ehSaida(movimento);
									return (
										<TableRow key={movimento.id}>
											<TableCell className="whitespace-nowrap">
												{movimento.datahora
													? formatDateTimeBrasilia(movimento.datahora)
													: formatDataCivilBrasilia(movimento.data)}
											</TableCell>
											<TableCell>
												<div className="flex flex-col gap-1">
													<span>{rotuloDocumento(movimento)}</span>
													{movimento.cancelado === 1 ? (
														<Badge variant="outline" className="w-fit text-xs">
															Cancelado
														</Badge>
													) : null}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{rotuloTipo(movimento)}</Badge>
											</TableCell>
											<TableCell
												className={
													saida
														? "text-right tabular-nums text-destructive"
														: "text-right tabular-nums text-emerald-700 dark:text-emerald-400"
												}
											>
												{rotuloQuantidade(movimento)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{formatarMoeda(movimento.valortotal)}
											</TableCell>
											<TableCell>{movimento.cfop ?? "—"}</TableCell>
											<TableCell>
												{TIPO_ESTOQUE_LABEL[movimento.tipoestoque ?? 0] ?? "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</div>

				{paginacao && paginacao.total > 0 ? (
					<div className="flex items-center justify-between gap-2">
						<p className="text-sm text-muted-foreground">
							Página {paginacao.page} de {paginacao.totalPages} (
							{paginacao.total} movimento
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
