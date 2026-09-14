"use client";

import { IconArrowRight, IconChartBar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	type DefinicaoRelatorioProduto,
	LINKS_RESUMO_QUALIDADE,
	RELATORIOS_PRODUTOS,
} from "@/constants/relatorios-produtos";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	formatarChaveResumo,
	relatoriosProdutosService,
} from "@/services/relatorios-produtos.service";

function CartaoRelatorio({
	relatorio,
}: {
	relatorio: DefinicaoRelatorioProduto;
}) {
	return (
		<Link
			href={`/produtos/relatorios/${relatorio.tipo}`}
			className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Card className="h-full transition-colors hover:bg-muted/40">
				<CardHeader>
					<IconChartBar
						className="mb-2 size-5 text-primary"
						aria-hidden="true"
					/>
					<CardTitle>{relatorio.titulo}</CardTitle>
					<CardDescription>{relatorio.descricao}</CardDescription>
				</CardHeader>
			</Card>
		</Link>
	);
}

function CartaoResumo({
	chave,
	valor,
}: {
	chave: string;
	valor: string | number;
}) {
	const href =
		LINKS_RESUMO_QUALIDADE[chave] ?? "/produtos/relatorios/qualidade";
	return (
		<Link
			href={href}
			className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Card className="h-full transition-colors hover:bg-muted/40">
				<CardHeader>
					<CardTitle>{formatarChaveResumo(chave)}</CardTitle>
				</CardHeader>
				<CardContent className="flex items-end justify-between">
					<strong className="text-2xl">{valor}</strong>
					<IconArrowRight className="size-4" aria-hidden="true" />
				</CardContent>
			</Card>
		</Link>
	);
}

export default function RelatoriosProdutosPage() {
	const tituloQualidadeId = useId();
	const { localStorageEmpresa } = useEmpresa();
	const idempresa = localStorageEmpresa?.id;

	const qualidade = useQuery({
		queryKey: ["relatorios-produtos", "qualidade", idempresa, "hub"],
		queryFn: () =>
			relatoriosProdutosService.consultar("qualidade", {
				idempresa: idempresa ?? "",
				page: 1,
				limit: 5,
			}),
		enabled: !!idempresa,
	});

	const indicadores = Object.entries(qualidade.data?.resumo ?? {});

	return (
		<PageContainer>
			<main className="space-y-8 px-4 py-6">
				<header>
					<h1 className="text-2xl font-bold">Relatórios de produtos</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Consulte qualidade, cadastro, estoque e desempenho do catálogo em
						visões consolidadas.
					</p>
				</header>

				{idempresa ? (
					qualidade.isError ? (
						<Alert variant="destructive">
							<AlertTitle>Não foi possível carregar a qualidade</AlertTitle>
							<AlertDescription>{qualidade.error.message}</AlertDescription>
						</Alert>
					) : (
						<section aria-labelledby={tituloQualidadeId}>
							<div className="mb-3 flex items-center justify-between">
								<div>
									<h2 id={tituloQualidadeId} className="text-lg font-semibold">
										Qualidade do catálogo
									</h2>
									<p className="text-sm text-muted-foreground">
										Indicadores calculados pelo serviço de relatórios.
									</p>
								</div>
								<Link
									href="/produtos/relatorios/qualidade"
									className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									Ver detalhes
								</Link>
							</div>
							{qualidade.isLoading ? (
								<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									{["a", "b", "c", "d"].map((chave) => (
										<Skeleton key={chave} className="h-28" />
									))}
								</div>
							) : indicadores.length ? (
								<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									{indicadores.map(([chave, valor]) => (
										<CartaoResumo key={chave} chave={chave} valor={valor} />
									))}
								</div>
							) : null}
						</section>
					)
				) : (
					<Alert>
						<AlertTitle>Selecione uma empresa</AlertTitle>
						<AlertDescription>
							Escolha uma empresa para consultar os relatórios de produtos.
						</AlertDescription>
					</Alert>
				)}

				<section aria-label="Lista de relatórios">
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{RELATORIOS_PRODUTOS.map((relatorio) => (
							<CartaoRelatorio key={relatorio.tipo} relatorio={relatorio} />
						))}
					</div>
				</section>
			</main>
		</PageContainer>
	);
}
