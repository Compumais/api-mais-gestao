"use client";

import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import { IconUsers } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, STATUS_MESA_LABEL } from "@/lib/gourmet-utils";
import type { ContaMesa } from "@/services/conta-mesa.service";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

interface MesaCardGarcomProps {
	conta: ContaMesa;
	totalParcial: number;
	qtdItens: number;
}

export function MesaCardGarcom({
	conta,
	totalParcial,
	qtdItens,
}: MesaCardGarcomProps) {
	const statusLabel = STATUS_MESA_LABEL[conta.status ?? 1] ?? "Aberta";
	const tempoAberto = conta.datacriacao
		? dayjs(conta.datacriacao).fromNow()
		: null;

	return (
		<Link href={`/garcom/comanda/${conta.id}`} className="block min-h-[120px]">
			<Card className="h-full cursor-pointer transition-colors active:scale-[0.98] hover:border-primary/50 hover:bg-accent/30">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between gap-2">
						<CardTitle className="text-lg">
							{conta.numeromesa}
						</CardTitle>
						<Badge variant="default" className="shrink-0 text-xs">
							{statusLabel}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground">Mesa / comanda</p>
				</CardHeader>
				<CardContent className="space-y-1.5 text-sm">
					<p className="text-xl font-bold text-primary">
						{formatCurrency(totalParcial)}
					</p>
					<p className="text-muted-foreground">
						{qtdItens} {qtdItens === 1 ? "item" : "itens"}
					</p>
					{conta.numeropessoas && (
						<p className="flex items-center gap-1 text-muted-foreground">
							<IconUsers className="size-3.5" />
							{conta.numeropessoas}{" "}
							{conta.numeropessoas === 1 ? "pessoa" : "pessoas"}
						</p>
					)}
					{tempoAberto && (
						<p className="text-xs text-muted-foreground">
							Aberta {tempoAberto}
						</p>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
