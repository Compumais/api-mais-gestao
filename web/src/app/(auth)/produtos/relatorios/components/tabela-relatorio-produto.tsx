"use client";

import {
	IconArrowsSort,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	ColunaRelatorioProduto,
	RelatorioProduto,
} from "@/services/relatorios-produtos.service";
import { formatarValorRelatorio } from "../relatorio-produto-formatters";

interface Props {
	colunas: ColunaRelatorioProduto[];
	dados: RelatorioProduto["data"];
	ordenarPor?: string;
	ordem?: "asc" | "desc";
	onOrdenar: (chave: string, ordem: "asc" | "desc") => void;
}

export function TabelaRelatorioProduto({
	colunas,
	dados,
	ordenarPor,
	ordem,
	onOrdenar,
}: Props) {
	return (
		<div className="overflow-x-auto rounded-lg border bg-card">
			<Table>
				<TableHeader>
					<TableRow>
						{colunas.map((coluna) => {
							const ativa = ordenarPor === coluna.chave;
							const proximaOrdem = ativa && ordem === "asc" ? "desc" : "asc";
							return (
								<TableHead
									key={coluna.chave}
									aria-sort={
										ativa
											? ordem === "asc"
												? "ascending"
												: "descending"
											: "none"
									}
									className={
										coluna.tipo === "numero" ||
										coluna.tipo === "moeda" ||
										coluna.tipo === "percentual"
											? "text-right"
											: undefined
									}
								>
									<Button
										variant="ghost"
										size="sm"
										className="-ml-3 h-8"
										onClick={() => onOrdenar(coluna.chave, proximaOrdem)}
										aria-label={`Ordenar por ${coluna.label} em ordem ${
											proximaOrdem === "asc" ? "crescente" : "decrescente"
										}`}
									>
										{coluna.label}
										{ativa && ordem === "asc" ? (
											<IconSortAscending
												className="size-4"
												aria-hidden="true"
											/>
										) : ativa ? (
											<IconSortDescending
												className="size-4"
												aria-hidden="true"
											/>
										) : (
											<IconArrowsSort className="size-4" aria-hidden="true" />
										)}
									</Button>
								</TableHead>
							);
						})}
					</TableRow>
				</TableHeader>
				<TableBody>
					{dados.map((linha, indice) => (
						<TableRow key={`${indice}-${String(linha.id ?? "")}`}>
							{colunas.map((coluna) => {
								const texto = formatarValorRelatorio(
									linha[coluna.chave] ?? null,
									coluna.tipo,
								);
								return (
									<TableCell
										key={coluna.chave}
										className={
											coluna.tipo === "numero" ||
											coluna.tipo === "moeda" ||
											coluna.tipo === "percentual"
												? "text-right tabular-nums"
												: undefined
										}
									>
										{coluna.tipo === "status" ? (
											<Badge variant="outline">{texto}</Badge>
										) : (
											texto
										)}
									</TableCell>
								);
							})}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
