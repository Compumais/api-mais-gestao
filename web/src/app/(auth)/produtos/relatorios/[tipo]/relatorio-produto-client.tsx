"use client";

import {
	IconAlertTriangle,
	IconChevronDown,
	IconDownload,
	IconLayoutColumns,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type FormatoExportacaoRelatorioProduto,
	type FiltrosRelatorioProduto as ParametrosRelatorioProduto,
	relatoriosProdutosService,
	type TipoRelatorioProduto,
} from "@/services/relatorios-produtos.service";
import {
	FiltrosRelatorioProduto,
	type ValoresFiltrosRelatorio,
} from "../components/filtros-relatorio-produto";
import { TabelaRelatorioProduto } from "../components/tabela-relatorio-produto";
import {
	baixarBlobRelatorio,
	formatarChaveResumo,
} from "../relatorio-produto-formatters";
import { RELATORIO_PRODUTO_POR_TIPO } from "../relatorios-produtos.config";

const CAMPOS_URL = [
	"q",
	"dataInicio",
	"dataFim",
	"situacao",
	"grupo",
	"fornecedor",
	"pendencia",
	"diasSemMovimento",
	"margemMin",
	"margemMax",
	"origem",
	"tipoEstoque",
] as const;

function numeroOpcional(valor: string | null): number | undefined {
	if (!valor) return undefined;
	const numero = Number(valor);
	return Number.isFinite(numero) ? numero : undefined;
}

export function RelatorioProdutoClient({
	tipo,
}: {
	tipo: TipoRelatorioProduto;
}) {
	const config = RELATORIO_PRODUTO_POR_TIPO[tipo];
	const router = useRouter();
	const searchParams = useSearchParams();
	const { localStorageEmpresa } = useEmpresa();
	const empresaId = localStorageEmpresa?.id;
	const limiteId = useId();
	const [colunasOcultas, setColunasOcultas] = useState<string[]>([]);

	const valoresFiltros = useMemo(() => {
		const valores: ValoresFiltrosRelatorio = {};
		for (const campo of CAMPOS_URL) {
			const valor = searchParams.get(campo);
			if (valor) valores[campo] = valor;
		}
		return valores;
	}, [searchParams]);

	const page = Math.max(1, Number(searchParams.get("page")) || 1);
	const limit = Math.min(
		100,
		Math.max(10, Number(searchParams.get("limit")) || 20),
	);
	const ordenarPor = searchParams.get("ordenarPor") ?? undefined;
	const ordem = searchParams.get("ordem") === "desc" ? "desc" : "asc";

	const filtros: ParametrosRelatorioProduto = {
		idempresa: empresaId ?? "",
		...valoresFiltros,
		diasSemMovimento: numeroOpcional(searchParams.get("diasSemMovimento")),
		margemMin: numeroOpcional(searchParams.get("margemMin")),
		margemMax: numeroOpcional(searchParams.get("margemMax")),
		page,
		limit,
		...(ordenarPor ? { ordenarPor, ordem } : {}),
	};

	const consulta = useQuery({
		queryKey: ["relatorios-produtos", tipo, empresaId, searchParams.toString()],
		queryFn: () => relatoriosProdutosService.consultar(tipo, filtros),
		enabled: !!empresaId,
		placeholderData: (anterior) => anterior,
	});

	const exportacao = useMutation({
		mutationFn: (formato: FormatoExportacaoRelatorioProduto) =>
			relatoriosProdutosService.exportar(tipo, formato, {
				...filtros,
				page: 1,
			}),
		onSuccess: (blob, formato) => {
			baixarBlobRelatorio(blob, `relatorio-produtos-${tipo}.${formato}`);
			toast.success("Relatório exportado");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const atualizarUrl = (
		alteracoes: Record<string, string | number | undefined>,
	) => {
		const params = new URLSearchParams(searchParams.toString());
		for (const [chave, valor] of Object.entries(alteracoes)) {
			if (valor === undefined || valor === "") params.delete(chave);
			else params.set(chave, String(valor));
		}
		router.replace(
			`/produtos/relatorios/${tipo}${params.size ? `?${params}` : ""}`,
		);
	};

	const aplicarFiltros = (valores: ValoresFiltrosRelatorio) => {
		const alteracoes: Record<string, string | undefined> = { page: "1" };
		for (const campo of CAMPOS_URL) alteracoes[campo] = valores[campo];
		atualizarUrl(alteracoes);
	};

	const limparFiltros = () => {
		const alteracoes: Record<string, undefined> = {};
		for (const campo of CAMPOS_URL) alteracoes[campo] = undefined;
		atualizarUrl({
			...alteracoes,
			page: undefined,
			ordenarPor: undefined,
			ordem: undefined,
		});
	};

	const colunasVisiveis =
		consulta.data?.colunas.filter(
			(coluna) => !colunasOcultas.includes(coluna.chave),
		) ?? [];

	return (
		<PageContainer>
			<main className="space-y-5 px-4 py-6">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<Link
							href="/produtos/relatorios"
							className="text-sm text-muted-foreground underline-offset-4 hover:underline"
						>
							Relatórios de produtos
						</Link>
						<h1 className="mt-1 text-2xl font-bold">
							{consulta.data?.titulo ?? config.titulo}
						</h1>
						<p className="mt-1 max-w-3xl text-sm text-muted-foreground">
							{config.descricao}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{consulta.data?.colunas.length ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline">
										<IconLayoutColumns className="size-4" aria-hidden="true" />
										Colunas
										<IconChevronDown className="size-4" aria-hidden="true" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="max-h-72">
									{consulta.data.colunas.map((coluna) => (
										<DropdownMenuCheckboxItem
											key={coluna.chave}
											checked={!colunasOcultas.includes(coluna.chave)}
											onCheckedChange={(visivel) =>
												setColunasOcultas((atuais) =>
													visivel
														? atuais.filter((item) => item !== coluna.chave)
														: [...atuais, coluna.chave],
												)
											}
										>
											{coluna.label}
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									disabled={!empresaId || exportacao.isPending}
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
					</div>
				</header>

				<FiltrosRelatorioProduto
					key={searchParams.toString()}
					campos={config.filtros}
					valores={valoresFiltros}
					opcoesPendencia={config.opcoesPendencia}
					onAplicar={aplicarFiltros}
					onLimpar={limparFiltros}
				/>

				{consulta.data?.avisos?.map((aviso) => (
					<Alert key={aviso}>
						<IconAlertTriangle aria-hidden="true" />
						<AlertTitle>Aviso do relatório</AlertTitle>
						<AlertDescription>{aviso}</AlertDescription>
					</Alert>
				))}

				{!empresaId ? (
					<Alert>
						<AlertTitle>Selecione uma empresa</AlertTitle>
						<AlertDescription>
							Escolha uma empresa para consultar este relatório.
						</AlertDescription>
					</Alert>
				) : consulta.isError ? (
					<Alert variant="destructive">
						<AlertTitle>Não foi possível carregar o relatório</AlertTitle>
						<AlertDescription>{consulta.error.message}</AlertDescription>
					</Alert>
				) : consulta.isLoading ? (
					<div className="space-y-3" aria-live="polite">
						<Skeleton className="h-20" />
						<Skeleton className="h-80" />
						<span className="sr-only">Carregando relatório</span>
					</div>
				) : consulta.data ? (
					<>
						{Object.keys(consulta.data.resumo).length ? (
							<section
								aria-label="Resumo do relatório"
								className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
							>
								{Object.entries(consulta.data.resumo).map(([chave, valor]) => (
									<Card key={chave}>
										<CardHeader>
											<CardTitle>{formatarChaveResumo(chave)}</CardTitle>
										</CardHeader>
										<CardContent>
											<strong className="text-xl">{valor}</strong>
										</CardContent>
									</Card>
								))}
							</section>
						) : null}

						{consulta.data.data.length && colunasVisiveis.length ? (
							<TabelaRelatorioProduto
								colunas={colunasVisiveis}
								dados={consulta.data.data}
								ordenarPor={ordenarPor}
								ordem={ordem}
								onOrdenar={(chave, novaOrdem) =>
									atualizarUrl({
										ordenarPor: chave,
										ordem: novaOrdem,
										page: 1,
									})
								}
							/>
						) : (
							<div
								className="rounded-lg border bg-card py-16 text-center text-sm text-muted-foreground"
								aria-live="polite"
							>
								{colunasVisiveis.length
									? "Nenhum registro encontrado para os filtros selecionados."
									: "Selecione ao menos uma coluna para visualizar o relatório."}
							</div>
						)}

						{consulta.data.paginacao.total > 0 ? (
							<nav
								aria-label="Paginação do relatório"
								className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex items-center gap-2">
									<Label htmlFor={limiteId}>Itens por página</Label>
									<Select
										value={String(limit)}
										onValueChange={(valor) =>
											atualizarUrl({ limit: valor, page: 1 })
										}
									>
										<SelectTrigger id={limiteId} className="w-20">
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
								<p className="text-sm text-muted-foreground" aria-live="polite">
									Página {consulta.data.paginacao.page} de{" "}
									{Math.max(1, consulta.data.paginacao.totalPages)} ·{" "}
									{consulta.data.paginacao.total} registros
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										disabled={page <= 1}
										onClick={() => atualizarUrl({ page: page - 1 })}
									>
										Anterior
									</Button>
									<Button
										variant="outline"
										disabled={page >= consulta.data.paginacao.totalPages}
										onClick={() => atualizarUrl({ page: page + 1 })}
									>
										Próxima
									</Button>
								</div>
							</nav>
						) : null}
					</>
				) : null}
			</main>
		</PageContainer>
	);
}
