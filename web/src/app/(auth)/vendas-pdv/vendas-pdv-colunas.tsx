import { IconEye, IconFileInvoice } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
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
				<span className="font-mono font-medium">
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
				<span className="block max-w-[160px] truncate text-sm">
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
					<div className="flex flex-wrap gap-1">
						{meios.map((meio) => (
							<Badge key={meio} variant="outline">
								{meio}
							</Badge>
						))}
					</div>
				);
			},
		},
		{
			id: "documento",
			header: "Documento",
			cell: ({ row }) => {
				const documento = documentoVenda(row.original);
				const nfce = rotuloNfce(row.original);
				if (documento === "fiscal") {
					return (
						<div className="flex flex-col gap-0.5">
							<Badge>Fiscal</Badge>
							{nfce ? (
								<span className="font-mono text-xs text-muted-foreground">
									NFC-e {nfce}
								</span>
							) : null}
						</div>
					);
				}
				return <Badge variant="secondary">Gerencial</Badge>;
			},
		},
		{
			accessorKey: "valortotal",
			header: () => <span className="block text-right">Total</span>,
			cell: ({ row }) => (
				<span className="block text-right font-medium tabular-nums">
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
					<div className="flex justify-end gap-1">
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
										? "Visualizar NFC-e"
										: "NFC-e ainda não vinculada a esta venda"
								}
								onClick={() => onVerNfce(row.original)}
							>
								<IconFileInvoice className="size-4" aria-hidden="true" />
								NFC-e
							</Button>
						) : null}
					</div>
				);
			},
		},
	];
}
