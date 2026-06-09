"use client";

import {
	IconArrowDown,
	IconArrowUp,
	IconBuildingBank,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	UltimaMovimentacao,
	UltimasMovimentacoes,
} from "@/services/dashboard.service";

interface DashboardTableProps {
	data?: UltimasMovimentacoes;
	isLoading: boolean;
}

export function DashboardTable({ data, isLoading }: DashboardTableProps) {
	return (
		<Card className="col-span-full">
			<CardHeader>
				<CardTitle>Últimas Movimentações</CardTitle>
				<CardDescription>
					Visualize as 5 últimas movimentações de cada categoria.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="pagar" className="space-y-4">
					<TabsList>
						<TabsTrigger value="pagar" className="gap-2">
							<IconArrowDown className="h-4 w-4 text-red-500" />
							Contas a Pagar
						</TabsTrigger>
						<TabsTrigger value="receber" className="gap-2">
							<IconArrowUp className="h-4 w-4 text-green-500" />
							Contas a Receber
						</TabsTrigger>
						<TabsTrigger value="bancarias" className="gap-2">
							<IconBuildingBank className="h-4 w-4 text-blue-500" />
							Transações Bancárias
						</TabsTrigger>
					</TabsList>

					<TabsContent value="pagar" className="space-y-4">
						<TransactionTable
							data={data?.pagar || []}
							isLoading={isLoading}
							type="P"
						/>
					</TabsContent>

					<TabsContent value="receber" className="space-y-4">
						<TransactionTable
							data={data?.receber || []}
							isLoading={isLoading}
							type="R"
						/>
					</TabsContent>

					<TabsContent value="bancarias" className="space-y-4">
						<TransactionTable
							data={data?.bancarias || []}
							isLoading={isLoading}
							type="B"
						/>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}

function TransactionTable({
	data,
	isLoading,
	type,
}: {
	data: UltimaMovimentacao[];
	isLoading: boolean;
	type: "P" | "R" | "B";
}) {
	if (isLoading) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				Carregando movimentações...
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="p-8 text-center text-muted-foreground">
				Nenhuma movimentação encontrada.
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Transação</TableHead>
						<TableHead>Data</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Registrado Por</TableHead>
						<TableHead className="text-right">Valor</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((item) => (
						<TableRow key={item.id}>
							<TableCell className="font-medium">{item.descricao}</TableCell>
							<TableCell>
								{item.data
									? new Date(item.data).toLocaleDateString("pt-BR")
									: "-"}
							</TableCell>
							<TableCell>
								<StatusBadge status={item.status} type={type} />
							</TableCell>
							<TableCell>{item.usuario}</TableCell>
							<TableCell
								className={`text-right font-medium ${
									item.natureza === "saida"
										? "text-red-500"
										: item.natureza === "entrada"
											? "text-green-500"
											: ""
								}`}
							>
								{new Intl.NumberFormat("pt-BR", {
									style: "currency",
									currency: "BRL",
								}).format(Number(item.valor))}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function StatusBadge({ status, type }: { status: string; type: string }) {
	let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
	let className = "";

	if (
		status === "Pago" ||
		status === "Recebido" ||
		status === "Quitado" ||
		status === "Conciliado"
	) {
		variant = "default"; // Usually black/primary
		className = "bg-green-500 hover:bg-green-600 border-transparent";
	} else if (status === "Pendente" || status === "Aberto") {
		variant = "secondary";
		className =
			"bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-200";
	} else if (status === "Vencido" || status === "Cancelado") {
		variant = "destructive";
	}

	return (
		<Badge variant={variant} className={className}>
			{status}
		</Badge>
	);
}
