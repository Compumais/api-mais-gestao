"use client";

import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import { IconUsers } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	formatCurrency,
	STATUS_MESA_LABEL,
} from "@/lib/gourmet-utils";
import type { ContaMesa } from "@/services/conta-mesa.service";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

interface MesaCardProps {
	conta: ContaMesa;
	totalParcial: number;
	qtdItens: number;
}

export function MesaCard({ conta, totalParcial, qtdItens }: MesaCardProps) {
	const statusLabel =
		STATUS_MESA_LABEL[conta.status ?? 1] ?? "Aberta";
	const tempoAberto = conta.datacriacao
		? dayjs(conta.datacriacao).fromNow()
		: null;

	return (
		<Link href={`/gourmet/conta/${conta.id}`}>
			<Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30">
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-xl">
							Mesa {conta.numeromesa}
						</CardTitle>
						<Badge variant="default">{statusLabel}</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p className="text-2xl font-bold text-primary">
						{formatCurrency(totalParcial)}
					</p>
					<p className="text-muted-foreground">
						{qtdItens} {qtdItens === 1 ? "item" : "itens"}
					</p>
					{conta.numeropessoas && (
						<p className="flex items-center gap-1 text-muted-foreground">
							<IconUsers className="size-4" />
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
