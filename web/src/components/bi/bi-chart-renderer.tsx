"use client";

import * as React from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/dashboard-periodo";
import type {
	BiFormatoValor,
	BiMapeamentoGrafico,
	BiTipoGrafico,
} from "@/services/editor-sql.service";

const CORES_PADRAO = [
	"#2563eb",
	"#16a34a",
	"#ea580c",
	"#7c3aed",
	"#dc2626",
	"#0891b2",
	"#ca8a04",
	"#db2777",
];

function paraNumero(val: unknown): number {
	if (typeof val === "number") return Number.isFinite(val) ? val : 0;
	if (typeof val === "string") {
		const limpo = val.replace(",", ".");
		const n = Number(limpo);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

export function formatarValorBi(
	val: unknown,
	formato: BiFormatoValor = "numero",
): string {
	const num = paraNumero(val);
	if (formato === "moeda") return formatCurrency(num);
	if (formato === "percentual") return `${formatNumber(num, 2)}%`;
	return formatNumber(num, Number.isInteger(num) ? 0 : 2);
}

interface BiChartRendererProps {
	tipoGrafico: BiTipoGrafico;
	mapeamento: BiMapeamentoGrafico;
	colunas: string[];
	linhas: Record<string, unknown>[];
	altura?: number;
}

export function BiChartRenderer({
	tipoGrafico,
	mapeamento,
	colunas,
	linhas,
	altura = 260,
}: BiChartRendererProps) {
	const formato = mapeamento.formato ?? "numero";
	const eixoX = mapeamento.eixoX || colunas[0] || "";
	const series = React.useMemo(() => {
		if (mapeamento.series && mapeamento.series.length > 0) {
			return mapeamento.series;
		}
		const colY = colunas[1] ?? colunas[0];
		return colY ? [{ coluna: colY, label: colY, cor: CORES_PADRAO[0] }] : [];
	}, [mapeamento.series, colunas]);

	const dadosNormalizados = React.useMemo(() => {
		return linhas.map((row) => {
			const item: Record<string, unknown> = { ...row };
			for (const s of series) {
				item[s.coluna] = paraNumero(row[s.coluna]);
			}
			return item;
		});
	}, [linhas, series]);

	if (linhas.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-sm text-muted-foreground"
				style={{ minHeight: tipoGrafico === "kpi" ? 110 : altura }}
			>
				Sem dados para o período selecionado.
			</div>
		);
	}

	if (tipoGrafico === "kpi") {
		const colValor = mapeamento.colunaValor || series[0]?.coluna || colunas[0];
		const primeiraLinha = linhas[0] ?? {};
		const valor = colValor ? primeiraLinha[colValor] : 0;
		return (
			<div className="flex min-h-[110px] flex-col justify-center gap-1 py-2">
				<div className="text-3xl font-bold tracking-tight">
					{formatarValorBi(valor, formato)}
				</div>
				{colValor && (
					<span className="text-xs text-muted-foreground">
						Coluna: {colValor}
					</span>
				)}
			</div>
		);
	}

	if (tipoGrafico === "tabela") {
		const previewLinhas = linhas.slice(0, 50);
		return (
			<div className="max-h-[300px] overflow-auto rounded-md border">
				<table className="w-full text-left text-xs">
					<thead className="sticky top-0 bg-muted/90 text-muted-foreground">
						<tr>
							{colunas.map((col) => (
								<th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
									{col}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y">
						{previewLinhas.map((row, idx) => (
							<tr key={idx} className="hover:bg-muted/40">
								{colunas.map((col) => {
									const v = row[col];
									const exibicao =
										v === null || v === undefined
											? "—"
											: typeof v === "object"
												? JSON.stringify(v)
												: String(v);
									return (
										<td
											key={col}
											className="max-w-[240px] truncate whitespace-nowrap px-3 py-1.5"
											title={exibicao}
										>
											{exibicao}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	if (tipoGrafico === "pizza") {
		const colValor = series[0]?.coluna || colunas[1] || colunas[0] || "";
		const dadosPizza = dadosNormalizados.map((d) => ({
			name: String(d[eixoX] ?? "—"),
			value: paraNumero(d[colValor]),
		}));

		return (
			<div style={{ width: "100%", height: altura }}>
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={dadosPizza}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={48}
							outerRadius={82}
							paddingAngle={2}
						>
							{dadosPizza.map((entry, idx) => (
								<Cell
									key={`${entry.name}-${idx}`}
									fill={CORES_PADRAO[idx % CORES_PADRAO.length]}
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value) => formatarValorBi(value, formato)}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</div>
		);
	}

	if (tipoGrafico === "linha") {
		return (
			<div style={{ width: "100%", height: altura }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={dadosNormalizados}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
						<XAxis dataKey={eixoX} tick={{ fontSize: 11 }} />
						<YAxis
							tick={{ fontSize: 11 }}
							tickFormatter={(v) => formatarValorBi(v, formato)}
							width={78}
						/>
						<Tooltip
							formatter={(value) => formatarValorBi(value, formato)}
						/>
						<Legend />
						{series.map((s, idx) => (
							<Line
								key={s.coluna}
								type="monotone"
								dataKey={s.coluna}
								name={s.label || s.coluna}
								stroke={s.cor || CORES_PADRAO[idx % CORES_PADRAO.length]}
								strokeWidth={2}
								dot={{ r: 3 }}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</div>
		);
	}

	if (tipoGrafico === "area") {
		return (
			<div style={{ width: "100%", height: altura }}>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={dadosNormalizados}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
						<XAxis dataKey={eixoX} tick={{ fontSize: 11 }} />
						<YAxis
							tick={{ fontSize: 11 }}
							tickFormatter={(v) => formatarValorBi(v, formato)}
							width={78}
						/>
						<Tooltip
							formatter={(value) => formatarValorBi(value, formato)}
						/>
						<Legend />
						{series.map((s, idx) => {
							const cor = s.cor || CORES_PADRAO[idx % CORES_PADRAO.length];
							return (
								<Area
									key={s.coluna}
									type="monotone"
									dataKey={s.coluna}
									name={s.label || s.coluna}
									stroke={cor}
									fill={cor}
									fillOpacity={0.2}
								/>
							);
						})}
					</AreaChart>
				</ResponsiveContainer>
			</div>
		);
	}

	// barra (default)
	return (
		<div style={{ width: "100%", height: altura }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={dadosNormalizados}>
					<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
					<XAxis dataKey={eixoX} tick={{ fontSize: 11 }} />
					<YAxis
						tick={{ fontSize: 11 }}
						tickFormatter={(v) => formatarValorBi(v, formato)}
						width={78}
					/>
					<Tooltip
						formatter={(value) => formatarValorBi(value, formato)}
					/>
					<Legend />
					{series.map((s, idx) => (
						<Bar
							key={s.coluna}
							dataKey={s.coluna}
							name={s.label || s.coluna}
							fill={s.cor || CORES_PADRAO[idx % CORES_PADRAO.length]}
							radius={[4, 4, 0, 0]}
						/>
					))}
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
