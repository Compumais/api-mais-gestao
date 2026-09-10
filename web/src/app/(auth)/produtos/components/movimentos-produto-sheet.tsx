"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { formatDataCivilBrasilia, formatDateTimeBrasilia } from "@/lib/date";
import { estoqueGestaoService } from "@/services/estoque-gestao.service";
import type { Produto } from "@/services/produtos.service";
import { LotesProdutoEstoque } from "./lotes-produto-estoque";

const TIPO_ESTOQUE_LABEL: Record<number, string> = {
	0: "Operacional",
	1: "Fiscal",
	2: "Ambos",
};

function formatarQuantidade(valor: string | null | undefined) {
	const n = Number.parseFloat(valor ?? "0");
	if (Number.isNaN(n)) return "0";
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

type MovimentosProdutoSheetProps = {
	produto: Produto | null;
	idempresa: string;
	onFechar: () => void;
};

export function MovimentosProdutoSheet({
	produto,
	idempresa,
	onFechar,
}: MovimentosProdutoSheetProps) {
	const codigoProduto =
		produto?.codigo != null ? String(produto.codigo) : undefined;

	const {
		data: movimentosData,
		isLoading: carregandoMovimentos,
		isError: erroMovimentos,
		error: erro,
	} = useQuery({
		queryKey: ["estoque-movimentos", idempresa, codigoProduto],
		queryFn: () =>
			estoqueGestaoService.listarMovimentos({
				idempresa,
				codigoproduto: codigoProduto,
				page: 1,
				limit: 50,
			}),
		enabled: !!idempresa && !!codigoProduto,
	});

	return (
		<Sheet open={!!produto} onOpenChange={(open) => !open && onFechar()}>
			<SheetContent className="overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>{produto?.nome}</SheetTitle>
					<SheetDescription>
						Código {codigoProduto ?? "-"} · Histórico de movimentos (últimos
						registros da empresa)
					</SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					<LotesProdutoEstoque
						idempresa={idempresa}
						codigoproduto={codigoProduto}
					/>

					<div className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-semibold">Movimentos</h3>
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
						{carregandoMovimentos ? (
							<p className="text-sm text-muted-foreground" aria-live="polite">
								Carregando...
							</p>
						) : erroMovimentos ? (
							<p className="text-sm text-destructive" role="alert">
								{erro.message}
							</p>
						) : (movimentosData?.data ?? []).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum movimento encontrado.
							</p>
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
										{mov.datahora
											? formatDateTimeBrasilia(mov.datahora)
											: formatDataCivilBrasilia(mov.data)}
									</p>
									<dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
										<dt className="text-muted-foreground">Documento</dt>
										<dd>{mov.tipodocumento ?? "—"}</dd>
										<dt className="text-muted-foreground">Origem</dt>
										<dd className="break-all">{mov.idoriginal ?? "—"}</dd>
										<dt className="text-muted-foreground">Observação</dt>
										<dd className="col-span-2 break-words">
											{mov.observacao ?? "—"}
										</dd>
									</dl>
								</div>
							))
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
