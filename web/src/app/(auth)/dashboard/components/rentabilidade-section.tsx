"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDashboardRentabilidade } from "@/hooks/dashboard/use-dashboard-queries";
import {
	formatCurrency,
	formatNumber,
	formatPercent,
} from "@/lib/dashboard-periodo";

const QUADRANTE_LABEL = {
	estrela: "Estrela",
	negociar: "Negociar custo",
	oportunidade: "Oportunidade",
	revisar: "Revisar",
} as const;

export function RentabilidadeSection() {
	const [dimensao, setDimensao] = React.useState<"produto" | "categoria">(
		"produto",
	);
	const { data, isLoading } = useDashboardRentabilidade(dimensao);

	if (isLoading || !data) {
		return (
			<div className="px-4 text-sm text-muted-foreground lg:px-6">
				Carregando rentabilidade…
			</div>
		);
	}

	const contagem = {
		estrela: data.itens.filter((i) => i.quadrante === "estrela").length,
		negociar: data.itens.filter((i) => i.quadrante === "negociar").length,
		oportunidade: data.itens.filter((i) => i.quadrante === "oportunidade")
			.length,
		revisar: data.itens.filter((i) => i.quadrante === "revisar").length,
	};

	return (
		<div className="flex flex-col gap-4 px-4 lg:px-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="text-sm text-muted-foreground">
					Mediana volume {formatNumber(data.medianaVolume, 1)} · Mediana margem{" "}
					{formatPercent(data.medianaMargem)}
				</div>
				<Select
					value={dimensao}
					onValueChange={(v) => setDimensao(v as "produto" | "categoria")}
				>
					<SelectTrigger className="w-[180px]" size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="produto">Por produto</SelectItem>
						<SelectItem value="categoria">Por categoria</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{(Object.keys(QUADRANTE_LABEL) as Array<keyof typeof QUADRANTE_LABEL>).map(
					(key) => (
						<Card key={key}>
							<CardHeader>
								<CardDescription>{QUADRANTE_LABEL[key]}</CardDescription>
								<CardTitle className="text-2xl tabular-nums">
									{contagem[key]}
								</CardTitle>
							</CardHeader>
						</Card>
					),
				)}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Quadrante volume × margem</CardTitle>
					<CardDescription>
						Alto volume + alta margem = estrela; baixo volume + baixa margem =
						revisar
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Item</TableHead>
								<TableHead>Quadrante</TableHead>
								<TableHead className="text-right">Qtd</TableHead>
								<TableHead className="text-right">Receita</TableHead>
								<TableHead className="text-right">Custo</TableHead>
								<TableHead className="text-right">Lucro</TableHead>
								<TableHead className="text-right">Margem</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.itens.map((item) => (
								<TableRow key={item.id}>
									<TableCell>{item.nome}</TableCell>
									<TableCell>
										<Badge variant="outline">
											{QUADRANTE_LABEL[item.quadrante]}
										</Badge>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatNumber(item.quantidade, 2)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.faturamento)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.custo)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(item.lucro)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatPercent(item.margemPct)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
