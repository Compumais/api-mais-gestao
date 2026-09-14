"use client";

import {
	IconAlertTriangle,
	IconChevronDown,
	IconDownload,
	IconFilter,
	IconLayoutColumns,
	IconX,
} from "@tabler/icons-react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
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
import {
	type CampoFiltroRelatorioProduto,
	type OpcaoPendenciaRelatorioProduto,
	RELATORIO_PRODUTO_POR_TIPO,
	TIPOS_RELATORIO_PRODUTO,
	type TipoRelatorioProduto,
} from "@/constants/relatorios-produtos";
import { useEmpresa } from "@/hooks/use-empresa";
import { formatDataCivilBrasilia, formatDateTimeBrasilia } from "@/lib/date";
import {
	baixarBlobRelatorio,
	type FiltrosRelatorioProdutos,
	type FormatoExportacaoRelatorioProdutos,
	formatarChaveResumo,
	type RelatorioProdutosResposta,
	relatoriosProdutosService,
} from "@/services/relatorios-produtos.service";

const ROTULOS_FILTRO: Record<CampoFiltroRelatorioProduto, string> = {
	q: "Produto",
	dataInicio: "Data inicial",
	dataFim: "Data final",
	situacao: "Situação",
	grupo: "Grupo",
	fornecedor: "Fornecedor",
	pendencia: "Pendência",
	diasSemMovimento: "Dias sem movimento",
	margemMin: "Margem mínima (%)",
	margemMax: "Margem máxima (%)",
	origem: "Origem",
	tipoEstoque: "Tipo de estoque",
};

const PLACEHOLDERS: Partial<Record<CampoFiltroRelatorioProduto, string>> = {
	q: "Nome, código ou EAN",
	grupo: "Nome ou código do grupo",
	fornecedor: "Nome ou documento",
};

const CAMPOS_TEXTO = new Set<CampoFiltroRelatorioProduto>([
	"q",
	"grupo",
	"fornecedor",
	"diasSemMovimento",
	"margemMin",
	"margemMax",
]);

const moeda = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});
const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const percentual = new Intl.NumberFormat("pt-BR", {
	style: "percent",
	maximumFractionDigits: 2,
});

function isTipoRelatorio(valor: string): valor is TipoRelatorioProduto {
	return (TIPOS_RELATORIO_PRODUTO as readonly string[]).includes(valor);
}

function numeroOpcional(valor: string | null): number | undefined {
	if (!valor) return undefined;
	const n = Number(valor);
	return Number.isFinite(n) ? n : undefined;
}

function formatarValorRelatorio(
	valor: string | number | null,
	tipo = "texto",
): string {
	if (valor == null || valor === "") return "—";
	if (tipo === "data") {
		const texto = String(valor);
		return formatDataCivilBrasilia(texto) || texto;
	}
	if (tipo === "datahora") {
		const texto = String(valor);
		return formatDateTimeBrasilia(texto) || texto;
	}
	if (tipo === "moeda" || tipo === "numero" || tipo === "percentual") {
		const n =
			typeof valor === "number"
				? valor
				: Number(String(valor).replace(/\s/g, "").replace(",", "."));
		if (!Number.isFinite(n)) return String(valor);
		if (tipo === "moeda") return moeda.format(n);
		if (tipo === "percentual") return percentual.format(n / 100);
		return numero.format(n);
	}
	return String(valor);
}

type ValoresFiltro = Partial<Record<CampoFiltroRelatorioProduto, string>>;

function FiltrosRelatorio({
	campos,
	valores,
	opcoesPendencia = [],
	onAplicar,
	onLimpar,
}: {
	campos: CampoFiltroRelatorioProduto[];
	valores: ValoresFiltro;
	opcoesPendencia?: OpcaoPendenciaRelatorioProduto[];
	onAplicar: (valores: ValoresFiltro) => void;
	onLimpar: () => void;
}) {
	const idBase = useId();
	const [rascunho, setRascunho] = useState(valores);

	function atualizar(campo: CampoFiltroRelatorioProduto, valor: string) {
		setRascunho((atual) => ({ ...atual, [campo]: valor }));
	}

	function renderCampo(campo: CampoFiltroRelatorioProduto) {
		const id = `${idBase}-${campo}`;
		if (campo === "situacao") {
			return (
				<div key={campo} className="space-y-1.5">
					<Label htmlFor={id}>{ROTULOS_FILTRO[campo]}</Label>
					<Select
						value={rascunho[campo] || "todos"}
						onValueChange={(valor) =>
							atualizar(campo, valor === "todos" ? "" : valor)
						}
					>
						<SelectTrigger id={id}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todos">Todas</SelectItem>
							<SelectItem value="ativo">Ativos</SelectItem>
							<SelectItem value="inativo">Inativos</SelectItem>
						</SelectContent>
					</Select>
				</div>
			);
		}
		if (campo === "pendencia") {
			return (
				<div key={campo} className="space-y-1.5">
					<Label htmlFor={id}>{ROTULOS_FILTRO[campo]}</Label>
					<Select
						value={rascunho[campo] || "todos"}
						onValueChange={(valor) =>
							atualizar(campo, valor === "todos" ? "" : valor)
						}
					>
						<SelectTrigger id={id}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todos">Todas</SelectItem>
							{opcoesPendencia.map((opcao) => (
								<SelectItem key={opcao.value} value={opcao.value}>
									{opcao.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);
		}
		if (campo === "origem") {
			return (
				<div key={campo} className="space-y-1.5">
					<Label htmlFor={id}>{ROTULOS_FILTRO[campo]}</Label>
					<Select
						value={rascunho[campo] || "todos"}
						onValueChange={(valor) =>
							atualizar(campo, valor === "todos" ? "" : valor)
						}
					>
						<SelectTrigger id={id}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todos">Todas</SelectItem>
							<SelectItem value="pdv">PDV</SelectItem>
							<SelectItem value="nota_fiscal">Nota fiscal</SelectItem>
							<SelectItem value="acerto">Acerto</SelectItem>
							<SelectItem value="producao">Produção</SelectItem>
							<SelectItem value="outro">Outro</SelectItem>
						</SelectContent>
					</Select>
				</div>
			);
		}
		if (campo === "tipoEstoque") {
			return (
				<div key={campo} className="space-y-1.5">
					<Label htmlFor={id}>{ROTULOS_FILTRO[campo]}</Label>
					<Select
						value={rascunho[campo] || "todos"}
						onValueChange={(valor) =>
							atualizar(campo, valor === "todos" ? "" : valor)
						}
					>
						<SelectTrigger id={id}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="todos">Todos</SelectItem>
							<SelectItem value="operacional">Operacional</SelectItem>
							<SelectItem value="fiscal">Fiscal</SelectItem>
							<SelectItem value="ambos">Ambos</SelectItem>
						</SelectContent>
					</Select>
				</div>
			);
		}
		if (campo === "dataInicio" || campo === "dataFim") {
			return (
				<div key={campo} className="space-y-1.5">
					<Label htmlFor={id}>{ROTULOS_FILTRO[campo]}</Label>
					<Input
						id={id}
						type="date"
						value={rascunho[campo] ?? ""}
						onChange={(evento) => atualizar(campo, evento.target.value)}
					/>
				</div>
			);
		}
		return (
			<div key={campo} className="space-y-1.5">
				<Label htmlFor={id}>{ROTULOS_FILTRO[campo]}</Label>
				<Input
					id={id}
					type={
						CAMPOS_TEXTO.has(campo) &&
						campo !== "q" &&
						campo !== "grupo" &&
						campo !== "fornecedor"
							? "number"
							: "text"
					}
					placeholder={PLACEHOLDERS[campo]}
					value={rascunho[campo] ?? ""}
					onChange={(evento) => atualizar(campo, evento.target.value)}
				/>
			</div>
		);
	}

	return (
		<form
			className="space-y-3 rounded-lg border bg-card p-4"
			onSubmit={(evento) => {
				evento.preventDefault();
				onAplicar(rascunho);
			}}
		>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{campos.map(renderCampo)}
			</div>
			<div className="flex flex-wrap gap-2">
				<Button type="submit">
					<IconFilter className="size-4" aria-hidden="true" />
					Aplicar filtros
				</Button>
				<Button type="button" variant="outline" onClick={onLimpar}>
					<IconX className="size-4" aria-hidden="true" />
					Limpar
				</Button>
			</div>
		</form>
	);
}

function TabelaRelatorio({
	colunas,
	dados,
	ordenarPor,
	ordem,
	onOrdenar,
}: {
	colunas: RelatorioProdutosResposta["colunas"];
	dados: RelatorioProdutosResposta["data"];
	ordenarPor?: string;
	ordem?: "asc" | "desc";
	onOrdenar: (coluna: string, ordem: "asc" | "desc") => void;
}) {
	return (
		<div className="rounded-lg border">
			<Table>
				<TableHeader>
					<TableRow>
						{colunas.map((coluna) => (
							<TableHead key={coluna.chave}>
								<Button
									type="button"
									variant="ghost"
									className="h-auto px-0 font-medium"
									onClick={() =>
										onOrdenar(
											coluna.chave,
											ordenarPor === coluna.chave && ordem === "asc"
												? "desc"
												: "asc",
										)
									}
								>
									{coluna.label}
									{ordenarPor === coluna.chave
										? ` ${ordem === "desc" ? "↓" : "↑"}`
										: ""}
								</Button>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{dados.map((linha) => {
						const chaveLinha = colunas
							.map((coluna) => String(linha[coluna.chave] ?? ""))
							.join("|");
						return (
							<TableRow key={chaveLinha}>
								{colunas.map((coluna) => (
									<TableCell key={coluna.chave}>
										{formatarValorRelatorio(
											linha[coluna.chave] ?? null,
											coluna.tipo,
										)}
									</TableCell>
								))}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

export default function RelatorioProdutoTipoPage() {
	const params = useParams<{ tipo: string }>();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { localStorageEmpresa } = useEmpresa();
	const limitId = useId();
	const [colunasOcultas, setColunasOcultas] = useState<string[]>([]);

	const tipo = params.tipo;
	const definicao = isTipoRelatorio(tipo)
		? RELATORIO_PRODUTO_POR_TIPO[tipo]
		: undefined;
	const idempresa = localStorageEmpresa?.id;

	const valoresFiltro = useMemo(() => {
		const valores: ValoresFiltro = {};
		if (!definicao) return valores;
		for (const campo of definicao.filtros) {
			const atual = searchParams.get(campo);
			if (atual) valores[campo] = atual;
		}
		return valores;
	}, [definicao, searchParams]);

	const page = Number(searchParams.get("page") ?? "1") || 1;
	const limit = Number(searchParams.get("limit") ?? "20") || 20;
	const ordenarPor = searchParams.get("ordenarPor") ?? undefined;
	const ordem = searchParams.get("ordem") === "desc" ? "desc" : "asc";

	const filtrosConsulta: FiltrosRelatorioProdutos | null = idempresa
		? {
				idempresa,
				...valoresFiltro,
				diasSemMovimento: numeroOpcional(searchParams.get("diasSemMovimento")),
				margemMin: numeroOpcional(searchParams.get("margemMin")),
				margemMax: numeroOpcional(searchParams.get("margemMax")),
				page,
				limit,
				...(ordenarPor ? { ordenarPor, ordem } : {}),
			}
		: null;

	const consulta = useQuery({
		queryKey: ["relatorios-produtos", tipo, idempresa, searchParams.toString()],
		queryFn: () =>
			relatoriosProdutosService.consultar(
				tipo as TipoRelatorioProduto,
				filtrosConsulta as FiltrosRelatorioProdutos,
			),
		enabled: !!idempresa && !!definicao,
		placeholderData: keepPreviousData,
	});

	const exportar = useMutation({
		mutationFn: (formato: FormatoExportacaoRelatorioProdutos) =>
			relatoriosProdutosService.exportar(
				tipo as TipoRelatorioProduto,
				formato,
				{ ...(filtrosConsulta as FiltrosRelatorioProdutos), page: 1 },
			),
		onSuccess: (blob, formato) => {
			baixarBlobRelatorio(blob, `relatorio-produtos-${tipo}.${formato}`);
			toast.success("Relatório exportado");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao exportar relatório");
		},
	});

	function atualizarUrl(parcial: Record<string, string | number | undefined>) {
		const proximo = new URLSearchParams(searchParams.toString());
		for (const [chave, valor] of Object.entries(parcial)) {
			if (valor === undefined || valor === "") proximo.delete(chave);
			else proximo.set(chave, String(valor));
		}
		const query = proximo.toString();
		router.replace(`/produtos/relatorios/${tipo}${query ? `?${query}` : ""}`);
	}

	if (!definicao) {
		return (
			<PageContainer>
				<main className="space-y-5 px-4 py-6">
					<Alert variant="destructive">
						<AlertTitle>Relatório não encontrado</AlertTitle>
						<AlertDescription>
							O tipo informado não existe. Volte à lista de relatórios de
							produtos.
						</AlertDescription>
					</Alert>
					<Link
						href="/produtos/relatorios"
						className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					>
						Relatórios de produtos
					</Link>
				</main>
			</PageContainer>
		);
	}

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
							{consulta.data?.titulo ?? definicao.titulo}
						</h1>
						<p className="mt-1 max-w-3xl text-sm text-muted-foreground">
							{definicao.descricao}
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
											onCheckedChange={(marcado) =>
												setColunasOcultas((atual) =>
													marcado
														? atual.filter((chave) => chave !== coluna.chave)
														: [...atual, coluna.chave],
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
									disabled={!idempresa || exportar.isPending}
								>
									<IconDownload className="size-4" aria-hidden="true" />
									{exportar.isPending ? "Exportando..." : "Exportar"}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{(["csv", "xlsx", "pdf"] as const).map((formato) => (
									<DropdownMenuItem
										key={formato}
										onClick={() => exportar.mutate(formato)}
									>
										{formato.toUpperCase()}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>

				<FiltrosRelatorio
					key={searchParams.toString()}
					campos={definicao.filtros}
					valores={valoresFiltro}
					opcoesPendencia={definicao.opcoesPendencia}
					onAplicar={(valores) => {
						const proximo: Record<string, string | undefined> = { page: "1" };
						for (const campo of definicao.filtros) {
							proximo[campo] = valores[campo];
						}
						atualizarUrl(proximo);
					}}
					onLimpar={() => {
						const limpo: Record<string, undefined> = {};
						for (const campo of definicao.filtros) {
							limpo[campo] = undefined;
						}
						atualizarUrl({
							...limpo,
							page: undefined,
							ordenarPor: undefined,
							ordem: undefined,
						});
					}}
				/>

				{consulta.data?.avisos?.map((aviso) => (
					<Alert key={aviso}>
						<IconAlertTriangle className="size-4" aria-hidden="true" />
						<AlertTitle>Atenção</AlertTitle>
						<AlertDescription>{aviso}</AlertDescription>
					</Alert>
				))}

				{idempresa ? (
					consulta.isError ? (
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
									{Object.entries(consulta.data.resumo).map(
										([chave, valor]) => (
											<div
												key={chave}
												className="rounded-lg border bg-card px-4 py-3"
											>
												<p className="text-sm text-muted-foreground">
													{formatarChaveResumo(chave)}
												</p>
												<p className="text-xl font-semibold">{valor}</p>
											</div>
										),
									)}
								</section>
							) : null}
							{consulta.data.data.length && colunasVisiveis.length ? (
								<TabelaRelatorio
									colunas={colunasVisiveis}
									dados={consulta.data.data}
									ordenarPor={ordenarPor}
									ordem={ordem}
									onOrdenar={(coluna, novaOrdem) =>
										atualizarUrl({
											ordenarPor: coluna,
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
										<Label htmlFor={limitId}>Itens por página</Label>
										<Select
											value={String(limit)}
											onValueChange={(valor) =>
												atualizarUrl({ limit: valor, page: 1 })
											}
										>
											<SelectTrigger id={limitId} className="w-20">
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
									<p
										className="text-sm text-muted-foreground"
										aria-live="polite"
									>
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
					) : null
				) : (
					<Alert>
						<AlertTitle>Selecione uma empresa</AlertTitle>
						<AlertDescription>
							Escolha uma empresa para consultar este relatório.
						</AlertDescription>
					</Alert>
				)}
			</main>
		</PageContainer>
	);
}
