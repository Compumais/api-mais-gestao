"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconDownload, IconFileInvoice } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { formatDateTimeBrasilia, inicioFimMesBrasilia } from "@/lib/date";
import { formatCurrency } from "@/lib/gourmet-utils";
import {
	type FiltrosFormularioNotasFiscais,
	type FormatoExportacaoNotasFiscais,
	filtrosRelatorioNotasFiscaisSchema,
	relatorioNotasFiscaisService,
} from "@/services/relatorio-notas-fiscais.service";

function baixarArquivo(blob: Blob, formato: FormatoExportacaoNotasFiscais) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `relatorio-notas-fiscais.${formato}`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function badgeStatus(status: number) {
	if (status === 100) return "default" as const;
	if (status === 101 || status === 135) return "destructive" as const;
	if (status === 102) return "secondary" as const;
	return "outline" as const;
}

function badgeAmbiente(ambiente: number | null) {
	if (ambiente === 1)
		return "border-emerald-600/40 bg-emerald-500/10 text-emerald-700";
	if (ambiente === 2)
		return "border-amber-600/40 bg-amber-500/10 text-amber-700";
	return "text-muted-foreground";
}

export default function RelatorioNotasFiscaisPage() {
	const { inicio, fim } = inicioFimMesBrasilia();
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id ?? "";
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [filtros, setFiltros] = useState<FiltrosFormularioNotasFiscais>({
		dataInicio: inicio,
		dataFim: fim,
		ambiente: "todos",
		status: "todos",
		modelo: "todos",
		serie: "",
		numeroChave: "",
		destinatario: "",
	});

	const form = useForm<FiltrosFormularioNotasFiscais>({
		resolver: zodResolver(filtrosRelatorioNotasFiscaisSchema),
		defaultValues: filtros,
	});

	const parametros = { ...filtros, idempresa, page, limit };
	const consulta = useQuery({
		queryKey: ["relatorio-notas-fiscais", parametros],
		queryFn: () => relatorioNotasFiscaisService.consultar(parametros),
		enabled: Boolean(idempresa),
		placeholderData: (anterior) => anterior,
	});

	const exportacao = useMutation({
		mutationFn: (formato: FormatoExportacaoNotasFiscais) =>
			relatorioNotasFiscaisService.exportar(formato, {
				...parametros,
				page: 1,
			}),
		onSuccess: baixarArquivo,
		onError: (erro: Error) => toast.error(erro.message),
	});

	const aplicarFiltros = form.handleSubmit((valores) => {
		setFiltros(valores);
		setPage(1);
	});

	const limparFiltros = () => {
		const valores: FiltrosFormularioNotasFiscais = {
			dataInicio: inicio,
			dataFim: fim,
			ambiente: "todos",
			status: "todos",
			modelo: "todos",
			serie: "",
			numeroChave: "",
			destinatario: "",
		};
		form.reset(valores);
		setFiltros(valores);
		setPage(1);
	};

	const resumo = consulta.data?.resumo;

	return (
		<PageContainer>
			<main className="space-y-5 px-4 py-6">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-2xl font-bold">Relatório de Notas Fiscais</h1>
						<p className="mt-1 max-w-3xl text-sm text-muted-foreground">
							NF-e e NFC-e de saída, incluindo cancelamentos e faixas
							inutilizadas, com produção e homologação sempre identificadas.
						</p>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								disabled={!idempresa || exportacao.isPending}
							>
								<IconDownload className="size-4" aria-hidden="true" />
								{exportacao.isPending ? "Exportando..." : "Exportar"}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{(["csv", "xlsx", "pdf"] as const).map((formato) => (
								<DropdownMenuItem
									key={formato}
									onClick={() => exportacao.mutate(formato)}
								>
									{formato.toUpperCase()}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</header>

				<form
					onSubmit={aplicarFiltros}
					className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
				>
					<div className="space-y-2">
						<Label htmlFor="dataInicio">Data inicial</Label>
						<Input
							id="dataInicio"
							type="date"
							{...form.register("dataInicio")}
						/>
						<p className="text-xs text-destructive">
							{form.formState.errors.dataInicio?.message}
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="dataFim">Data final</Label>
						<Input id="dataFim" type="date" {...form.register("dataFim")} />
						<p className="text-xs text-destructive">
							{form.formState.errors.dataFim?.message}
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="ambiente">Ambiente</Label>
						<Controller
							name="ambiente"
							control={form.control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger id="ambiente">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos</SelectItem>
										<SelectItem value="1">Produção</SelectItem>
										<SelectItem value="2">Homologação</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<Controller
							name="status"
							control={form.control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger id="status">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos</SelectItem>
										<SelectItem value="pendente">Emitida/Pendente</SelectItem>
										<SelectItem value="autorizada">Autorizada</SelectItem>
										<SelectItem value="cancelada">Cancelada</SelectItem>
										<SelectItem value="inutilizada">Inutilizada</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="modelo">Modelo</Label>
						<Controller
							name="modelo"
							control={form.control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger id="modelo">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">55 e 65</SelectItem>
										<SelectItem value="55">NF-e (55)</SelectItem>
										<SelectItem value="65">NFC-e (65)</SelectItem>
									</SelectContent>
								</Select>
							)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="serie">Série</Label>
						<Input
							id="serie"
							placeholder="Ex.: 1"
							{...form.register("serie")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="numeroChave">Número, chave ou protocolo</Label>
						<Input
							id="numeroChave"
							placeholder="Busca parcial"
							{...form.register("numeroChave")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="destinatario">Cliente/destinatário</Label>
						<Input
							id="destinatario"
							placeholder="Nome ou razão social"
							{...form.register("destinatario")}
						/>
					</div>
					<div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
						<Button type="submit">Aplicar filtros</Button>
						<Button type="button" variant="outline" onClick={limparFiltros}>
							Limpar
						</Button>
					</div>
				</form>

				{!idempresa ? (
					<Alert>
						<AlertTitle>Selecione uma empresa</AlertTitle>
						<AlertDescription>
							Escolha uma empresa para consultar o relatório.
						</AlertDescription>
					</Alert>
				) : consulta.isError ? (
					<Alert variant="destructive">
						<AlertTitle>Não foi possível carregar o relatório</AlertTitle>
						<AlertDescription>{consulta.error.message}</AlertDescription>
					</Alert>
				) : consulta.isLoading ? (
					<div className="space-y-3" aria-live="polite">
						<Skeleton className="h-24" />
						<Skeleton className="h-80" />
						<span className="sr-only">Carregando relatório</span>
					</div>
				) : consulta.data ? (
					<>
						<section
							aria-label="Resumo por status"
							className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
						>
							{[
								["Total", resumo?.total ?? 0],
								[
									"Emitidas/pendentes",
									resumo?.porStatus.emitidasPendentes ?? 0,
								],
								["Autorizadas", resumo?.porStatus.autorizadas ?? 0],
								["Canceladas", resumo?.porStatus.canceladas ?? 0],
								["Inutilizadas", resumo?.porStatus.inutilizadas ?? 0],
							].map(([titulo, valor]) => (
								<Card key={titulo}>
									<CardHeader className="pb-2">
										<CardTitle className="text-sm">{titulo}</CardTitle>
									</CardHeader>
									<CardContent>
										<strong className="text-2xl">{valor}</strong>
									</CardContent>
								</Card>
							))}
						</section>

						<section
							aria-label="Resumo por ambiente"
							className="flex flex-wrap gap-2"
						>
							<Badge variant="outline" className={badgeAmbiente(1)}>
								Produção: {resumo?.porAmbiente.producao ?? 0}
							</Badge>
							<Badge variant="outline" className={badgeAmbiente(2)}>
								Homologação: {resumo?.porAmbiente.homologacao ?? 0}
							</Badge>
							{Boolean(resumo?.porAmbiente.naoInformado) && (
								<Badge variant="outline">
									Não informado: {resumo?.porAmbiente.naoInformado}
								</Badge>
							)}
						</section>

						{consulta.data.avisos.map((aviso) => (
							<Alert key={aviso}>
								<IconFileInvoice aria-hidden="true" />
								<AlertTitle>Critério fiscal do relatório</AlertTitle>
								<AlertDescription>{aviso}</AlertDescription>
							</Alert>
						))}

						<div className="overflow-x-auto rounded-lg border bg-card">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Data/hora</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Modelo</TableHead>
										<TableHead>Série/número/faixa</TableHead>
										<TableHead>Chave/protocolo</TableHead>
										<TableHead>Destinatário</TableHead>
										<TableHead className="text-right">Valor</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Ambiente</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{consulta.data.data.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={9}
												className="h-28 text-center text-muted-foreground"
											>
												Nenhum documento ou evento encontrado para os filtros.
											</TableCell>
										</TableRow>
									) : (
										consulta.data.data.map((linha) => (
											<TableRow key={linha.id}>
												<TableCell className="whitespace-nowrap">
													{linha.dataHora
														? formatDateTimeBrasilia(linha.dataHora)
														: "—"}
												</TableCell>
												<TableCell>
													{linha.tipo === "INUTILIZACAO"
														? "Inutilização"
														: "Nota fiscal"}
												</TableCell>
												<TableCell>{linha.modelo}</TableCell>
												<TableCell className="whitespace-nowrap">
													{linha.serie ?? "—"}/
													{linha.numeroInicial === linha.numeroFinal
														? linha.numeroInicial
														: `${linha.numeroInicial ?? "—"}–${linha.numeroFinal ?? "—"}`}
												</TableCell>
												<TableCell className="max-w-52 truncate font-mono text-xs">
													{linha.chave ?? linha.protocolo ?? "—"}
												</TableCell>
												<TableCell>{linha.destinatario ?? "—"}</TableCell>
												<TableCell className="text-right whitespace-nowrap">
													{linha.valorTotal == null
														? "—"
														: formatCurrency(Number(linha.valorTotal))}
												</TableCell>
												<TableCell>
													<Badge variant={badgeStatus(linha.statusCodigo)}>
														{linha.status}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className={badgeAmbiente(linha.ambiente)}
													>
														{linha.ambienteLabel}
													</Badge>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
							{consulta.data.paginacao.total > 0 && (
								<footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
									<div className="flex items-center gap-2">
										<Label htmlFor="itensPorPagina">Itens por página</Label>
										<Select
											value={String(limit)}
											onValueChange={(valor) => {
												setLimit(Number(valor));
												setPage(1);
											}}
										>
											<SelectTrigger id="itensPorPagina" className="w-20">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[10, 20, 50, 100].map((valor) => (
													<SelectItem key={valor} value={String(valor)}>
														{valor}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<p className="text-sm text-muted-foreground">
										Página {consulta.data.paginacao.page} de{" "}
										{consulta.data.paginacao.totalPages} (
										{consulta.data.paginacao.total} registros)
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											disabled={page <= 1}
											onClick={() => setPage((atual) => atual - 1)}
										>
											Anterior
										</Button>
										<Button
											variant="outline"
											disabled={page >= consulta.data.paginacao.totalPages}
											onClick={() => setPage((atual) => atual + 1)}
										>
											Próxima
										</Button>
									</div>
								</footer>
							)}
						</div>
					</>
				) : null}
			</main>
		</PageContainer>
	);
}
