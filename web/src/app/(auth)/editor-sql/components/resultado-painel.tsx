"use client";

import {
	AlertTriangle,
	BarChart3,
	Download,
	LayoutDashboard,
	Table as TableIcon,
} from "lucide-react";
import * as React from "react";
import { BiChartRenderer } from "@/components/bi/bi-chart-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	BiColSpan,
	BiFormatoValor,
	BiMapeamentoGrafico,
	BiResultadoExecucao,
	BiTipoGrafico,
} from "@/services/editor-sql.service";

interface ResultadoPainelProps {
	resultado: BiResultadoExecucao | null;
	erro: string | null;
	executando: boolean;
	tipoGrafico: BiTipoGrafico;
	onTipoGraficoChange: (tipo: BiTipoGrafico) => void;
	mapeamento: BiMapeamentoGrafico;
	onMapeamentoChange: (m: BiMapeamentoGrafico) => void;
	onPublicarWidget: (dados: {
		titulo: string;
		subtitulo: string;
		colSpan: BiColSpan;
	}) => void;
	publicando: boolean;
}

function exportarCsv(colunas: string[], linhas: Record<string, unknown>[]) {
	const escapar = (v: unknown) => {
		const s = v === null || v === undefined ? "" : String(v);
		if (s.includes(";") || s.includes('"') || s.includes("\n")) {
			return `"${s.replace(/"/g, '""')}"`;
		}
		return s;
	};
	const cabecalho = colunas.map(escapar).join(";");
	const corpo = linhas
		.map((row) => colunas.map((c) => escapar(row[c])).join(";"))
		.join("\n");
	const blob = new Blob([`\uFEFF${cabecalho}\n${corpo}`], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `consulta-bi-${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export function ResultadoPainel({
	resultado,
	erro,
	executando,
	tipoGrafico,
	onTipoGraficoChange,
	mapeamento,
	onMapeamentoChange,
	onPublicarWidget,
	publicando,
}: ResultadoPainelProps) {
	const [filtroTabela, setFiltroTabela] = React.useState("");
	const [tituloWidget, setTituloWidget] = React.useState("");
	const [subtituloWidget, setSubtituloWidget] = React.useState("");
	const [colSpan, setColSpan] = React.useState<BiColSpan>(6);

	const colunas = resultado?.colunas ?? [];
	const linhas = resultado?.linhas ?? [];

	const linhasFiltradas = React.useMemo(() => {
		const termo = filtroTabela.trim().toLowerCase();
		if (!termo) return linhas;
		return linhas.filter((row) =>
			colunas.some((c) => String(row[c] ?? "").toLowerCase().includes(termo)),
		);
	}, [linhas, colunas, filtroTabela]);

	if (erro) {
		return (
			<div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
				<div className="flex items-center gap-2 font-medium">
					<AlertTriangle className="size-4" />
					Erro ao executar consulta
				</div>
				<p className="mt-1 font-mono text-xs">{erro}</p>
			</div>
		);
	}

	if (executando) {
		return (
			<div className="flex min-h-[240px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
				Executando consulta em modo somente leitura...
			</div>
		);
	}

	if (!resultado) {
		return (
			<div className="flex min-h-[240px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
				<p>Execute uma consulta SQL (Ctrl + Enter) para visualizar os resultados.</p>
				<p className="text-xs">
					Você pode inspecionar a tabela, exportar em CSV ou publicar como gráfico no Meu Painel.
				</p>
			</div>
		);
	}

	const seriePrincipal =
		mapeamento.series?.[0]?.coluna || colunas[1] || colunas[0] || "";

	return (
		<div className="rounded-lg border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<Badge variant="secondary">
						{resultado.totalRetornado} linha(s)
					</Badge>
					<Badge variant="outline">{resultado.duracaoMs} ms</Badge>
					{resultado.truncado && (
						<Badge variant="destructive">
							Limitado a {resultado.totalRetornado} linhas
						</Badge>
					)}
				</div>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => exportarCsv(colunas, linhas)}
					disabled={linhas.length === 0}
				>
					<Download className="mr-1.5 size-3.5" />
					Exportar CSV
				</Button>
			</div>

			<Tabs defaultValue="tabela" className="p-4">
				<TabsList>
					<TabsTrigger value="tabela" className="gap-1.5">
						<TableIcon className="size-3.5" />
						Tabela
					</TabsTrigger>
					<TabsTrigger value="grafico" className="gap-1.5">
						<BarChart3 className="size-3.5" />
						Gráfico &amp; Publicar no Dashboard
					</TabsTrigger>
				</TabsList>

				<TabsContent value="tabela" className="mt-3 space-y-3">
					<Input
						value={filtroTabela}
						onChange={(e) => setFiltroTabela(e.target.value)}
						placeholder="Filtrar nos resultados..."
						className="max-w-xs h-8 text-xs"
					/>
					<div className="max-h-[380px] overflow-auto rounded-md border">
						<table className="w-full text-left text-xs">
							<thead className="sticky top-0 bg-muted text-muted-foreground">
								<tr>
									{colunas.map((col) => (
										<th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
											{col}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y">
								{linhasFiltradas.map((row, idx) => (
									<tr key={idx} className="hover:bg-muted/40">
										{colunas.map((col) => {
											const v = row[col];
											const texto =
												v === null || v === undefined
													? "—"
													: typeof v === "object"
														? JSON.stringify(v)
														: String(v);
											return (
												<td
													key={col}
													className="max-w-[260px] truncate whitespace-nowrap px-3 py-1.5 font-mono text-[11px]"
													title={texto}
												>
													{texto}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</TabsContent>

				<TabsContent value="grafico" className="mt-3 space-y-4">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<div className="space-y-1">
							<Label className="text-xs">Tipo de Visualização</Label>
							<Select
								value={tipoGrafico}
								onValueChange={(v) => onTipoGraficoChange(v as BiTipoGrafico)}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="barra">Barras</SelectItem>
									<SelectItem value="linha">Linha</SelectItem>
									<SelectItem value="area">Área</SelectItem>
									<SelectItem value="pizza">Pizza / Rosca</SelectItem>
									<SelectItem value="kpi">Cartão KPI</SelectItem>
									<SelectItem value="tabela">Tabela</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{tipoGrafico !== "kpi" && tipoGrafico !== "tabela" && (
							<div className="space-y-1">
								<Label className="text-xs">Eixo X / Categoria</Label>
								<Select
									value={mapeamento.eixoX || colunas[0] || ""}
									onValueChange={(v) =>
										onMapeamentoChange({ ...mapeamento, eixoX: v })
									}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{colunas.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{tipoGrafico !== "tabela" && (
							<div className="space-y-1">
								<Label className="text-xs">
									{tipoGrafico === "kpi" ? "Coluna do Valor" : "Coluna de Valor (Y)"}
								</Label>
								<Select
									value={
										tipoGrafico === "kpi"
											? mapeamento.colunaValor || colunas[0] || ""
											: seriePrincipal
									}
									onValueChange={(v) => {
										if (tipoGrafico === "kpi") {
											onMapeamentoChange({ ...mapeamento, colunaValor: v });
										} else {
											onMapeamentoChange({
												...mapeamento,
												series: [{ coluna: v, label: v, cor: "#2563eb" }],
											});
										}
									}}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{colunas.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="space-y-1">
							<Label className="text-xs">Formato</Label>
							<Select
								value={mapeamento.formato ?? "numero"}
								onValueChange={(v) =>
									onMapeamentoChange({
										...mapeamento,
										formato: v as BiFormatoValor,
									})
								}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="moeda">Moeda (R$)</SelectItem>
									<SelectItem value="numero">Número</SelectItem>
									<SelectItem value="percentual">Percentual (%)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="rounded-md border bg-background p-4">
						<BiChartRenderer
							tipoGrafico={tipoGrafico}
							mapeamento={mapeamento}
							colunas={colunas}
							linhas={linhas}
							altura={260}
						/>
					</div>

					<div className="rounded-md border bg-muted/30 p-3">
						<p className="mb-2 text-xs font-medium">
							Publicar no Dashboard (&ldquo;Meu Painel&rdquo;)
						</p>
						<div className="grid gap-2 sm:grid-cols-4">
							<Input
								value={tituloWidget}
								onChange={(e) => setTituloWidget(e.target.value)}
								placeholder="Título do card no dashboard"
								className="h-8 text-xs sm:col-span-2"
							/>
							<Select
								value={String(colSpan)}
								onValueChange={(v) => setColSpan(Number(v) as BiColSpan)}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="4">Largura: 1/3</SelectItem>
									<SelectItem value="6">Largura: 1/2</SelectItem>
									<SelectItem value="8">Largura: 2/3</SelectItem>
									<SelectItem value="12">Largura: 100%</SelectItem>
								</SelectContent>
							</Select>
							<Button
								type="button"
								size="sm"
								className="h-8 text-xs"
								disabled={publicando || !tituloWidget.trim()}
								onClick={() =>
									onPublicarWidget({
										titulo: tituloWidget.trim(),
										subtitulo: subtituloWidget.trim(),
										colSpan,
									})
								}
							>
								<LayoutDashboard className="mr-1.5 size-3.5" />
								{publicando ? "Publicando..." : "Publicar no Dashboard"}
							</Button>
						</div>
						<Input
							value={subtituloWidget}
							onChange={(e) => setSubtituloWidget(e.target.value)}
							placeholder="Subtítulo / descrição opcional"
							className="mt-2 h-8 text-xs"
						/>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
