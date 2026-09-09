"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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

	const { data: movimentosData, isLoading: carregandoMovimentos } = useQuery({
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
						<h3 className="text-sm font-semibold">Movimentos</h3>
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
				</div>
			</SheetContent>
		</Sheet>
	);
}
