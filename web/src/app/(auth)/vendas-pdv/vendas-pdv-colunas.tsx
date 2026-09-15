import { IconEye, IconFileInvoice } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusNfeBadge } from "@/app/(auth)/nota-fiscal-venda/components/status-nfe-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBrasilia } from "@/lib/date";
import { formatCurrency } from "@/lib/gourmet-utils";
import type { VendaPdvGourmet } from "@/services/venda-pdv-gourmet.service";
import {
	documentoVenda,
	idNfceVenda,
	meiosPagamentoVenda,
	nomeOperador,
	rotuloFiscal,
	rotuloNfce,
	tipoVenda,
} from "./vendas-pdv-helpers";

export function criarColunasVendasPdv(opcoes: {
	usuariosPorId: Record<string, string>;
	onVerItens: (venda: VendaPdvGourmet) => void;
	onVerNfce: (venda: VendaPdvGourmet) => void;
}): ColumnDef<VendaPdvGourmet>[] {
	const { usuariosPorId, onVerItens, onVerNfce } = opcoes;

	return [
		{
			accessorKey: "numeropdv",
			header: "Nº PDV",
			cell: ({ row }) => (
				<span className="font-mono font-medium tabular-nums">
					{row.getValue("numeropdv")}
				</span>
			),
		},
		{
			accessorKey: "datacriacao",
			header: "Data / Hora",
			cell: ({ row }) => {
				const val = row.getValue("datacriacao") as string | null;
				if (!val) return <span className="text-muted-foreground">—</span>;
				return (
					<span className="whitespace-nowrap tabular-nums">
						{formatDateTimeBrasilia(val)}
					</span>
				);
			},
		},
		{
			id: "tipo",
			header: "Origem",
			cell: ({ row }) => {
				const tipo = tipoVenda(row.original);
				return (
					<Badge variant={tipo === "Mesa" ? "secondary" : "outline"}>
						{tipo}
					</Badge>
				);
			},
		},
		{
			id: "operador",
			header: "Operador",
			cell: ({ row }) => (
				<span className="block max-w-[140px] truncate text-sm">
					{nomeOperador(row.original, usuariosPorId)}
				</span>
			),
		},
		{
			id: "pagamento",
			header: "Pagamento",
			cell: ({ row }) => {
				const meios = meiosPagamentoVenda(row.original);
				if (meios.length === 0) {
					return <span className="text-muted-foreground">—</span>;
				}
				return (
					<div className="flex max-w-[200px] flex-wrap gap-1">
						{meios.map((meio) => (
							<Badge key={meio} variant="outline" className="font-normal">
								{meio}
							</Badge>
						))}
					</div>
				);
			},
		},
		{
			id: "fiscal",
			header: "Fiscal",
			cell: ({ row }) => {
				const fiscal = rotuloFiscal(row.original) === "Fiscal";
				return (
					<Badge variant={fiscal ? "default" : "secondary"}>
						{fiscal ? "Fiscal" : "Não fiscal"}
					</Badge>
				);
			},
		},
		{
			id: "nfce",
			header: "NFC-e",
			cell: ({ row }) => {
				const venda = row.original;
				if (documentoVenda(venda) !== "fiscal") {
					return <span className="text-muted-foreground">—</span>;
				}
				const status = venda.nfce?.status ?? null;
				const numero = rotuloNfce(venda);
				if (status == null && !idNfceVenda(venda)) {
					return (
						<Badge variant="outline" className="font-normal">
							Sem NFC-e
						</Badge>
					);
				}
				return (
					<div className="flex min-w-[140px] flex-col items-start gap-1">
						<StatusNfeBadge status={status ?? 90} size="sm" />
						{numero ? (
							<span className="font-mono text-xs text-muted-foreground">
								{numero}
							</span>
						) : null}
					</div>
				);
			},
		},
		{
			accessorKey: "valortotal",
			header: () => <span className="block text-right">Total</span>,
			cell: ({ row }) => (
				<span className="block whitespace-nowrap text-right font-medium tabular-nums">
					{formatCurrency(row.original.valortotal)}
				</span>
			),
		},
		{
			id: "acoes",
			header: () => <span className="sr-only">Ações</span>,
			cell: ({ row }) => {
				const idNfce = idNfceVenda(row.original);
				const fiscal = documentoVenda(row.original) === "fiscal";
				return (
					<div className="flex justify-end gap-1 whitespace-nowrap">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5"
							onClick={() => onVerItens(row.original)}
						>
							<IconEye className="size-4" aria-hidden="true" />
							Itens
						</Button>
						{fiscal ? (
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5"
								disabled={!idNfce}
								title={
									idNfce
										? "Consultar NFC-e"
										: "NFC-e ainda não vinculada a esta venda"
								}
								onClick={() => onVerNfce(row.original)}
							>
								<IconFileInvoice className="size-4" aria-hidden="true" />
								Consultar
							</Button>
						) : null}
					</div>
				);
			},
		},
	];
}
