"use client";

import {
	IconArrowRight,
	IconChartBar,
	IconCircleCheck,
	IconDatabase,
} from "@tabler/icons-react";
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
import { useEmpresa } from "@/hooks/use-empresa";
import { relatoriosProdutosService } from "@/services/relatorios-produtos.service";
import { formatarChaveResumo } from "./relatorio-produto-formatters";
import { RELATORIOS_PRODUTOS } from "./relatorios-produtos.config";

function destinoIndicador(chave: string): string {
	const destinos: Record<string, string> = {
		total: "/produtos/relatorios/cadastro",
		ativos: "/produtos/relatorios/cadastro?situacao=ativo",
		inativos: "/produtos/relatorios/cadastro?situacao=inativo",
		sem_ean: "/produtos/relatorios/ean?pendencia=ean",
		sem_ncm: "/produtos/relatorios/fiscal?pendencia=ncm",
		sem_cest: "/produtos/relatorios/fiscal?pendencia=cest",
		sem_preco: "/produtos/relatorios/cadastro?pendencia=preco",
		sem_fornecedor: "/produtos/relatorios/cadastro?pendencia=fornecedor",
		sem_grupo: "/produtos/relatorios/cadastro?pendencia=grupo",
		sem_tributacao: "/produtos/relatorios/fiscal?pendencia=tributacao",
		sem_foto: "/produtos/relatorios/cadastro?pendencia=foto",
		ean_duplicado: "/produtos/relatorios/ean?pendencia=duplicado",
		codigo_duplicado: "/produtos/relatorios/cadastro?pendencia=duplicado",
		estoque_negativo: "/produtos/relatorios/estoque?pendencia=negativo",
		margem_baixa: "/produtos/relatorios/qualidade?pendencia=margem_baixa",
	};
	return destinos[chave] ?? "/produtos/relatorios/qualidade";
}

export default function RelatoriosProdutosPage() {
	const qualidadeHeadingId = useId();
	const areasHeadingId = useId();
	const { localStorageEmpresa } = useEmpresa();
	const empresaId = localStorageEmpresa?.id;
	const qualidade = useQuery({
		queryKey: ["relatorios-produtos", "qualidade", empresaId, "hub"],
		queryFn: () =>
			relatoriosProdutosService.consultar("qualidade", {
				idempresa: empresaId ?? "",
				page: 1,
				limit: 5,
			}),
		enabled: !!empresaId,
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

				{!empresaId ? (
					<Alert>
						<IconDatabase aria-hidden="true" />
						<AlertTitle>Selecione uma empresa</AlertTitle>
						<AlertDescription>
							Escolha uma empresa para carregar os indicadores e relatórios.
						</AlertDescription>
					</Alert>
				) : qualidade.isError ? (
					<Alert variant="destructive">
						<AlertTitle>Não foi possível carregar a qualidade</AlertTitle>
						<AlertDescription>{qualidade.error.message}</AlertDescription>
					</Alert>
				) : (
					<section aria-labelledby={qualidadeHeadingId}>
						<div className="mb-3 flex items-center justify-between">
							<div>
								<h2 id={qualidadeHeadingId} className="text-lg font-semibold">
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
								{["a", "b", "c", "d"].map((item) => (
									<Skeleton key={item} className="h-28" />
								))}
							</div>
						) : indicadores.length ? (
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
								{indicadores.map(([chave, valor]) => (
									<Link
										key={chave}
										href={destinoIndicador(chave)}
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
								))}
							</div>
						) : (
							<Card>
								<CardContent className="flex items-center gap-2 py-2">
									<IconCircleCheck className="size-5" aria-hidden="true" />
									<span>Nenhum indicador de qualidade disponível.</span>
								</CardContent>
							</Card>
						)}
					</section>
				)}

				<section aria-labelledby={areasHeadingId}>
					<h2 id={areasHeadingId} className="mb-3 text-lg font-semibold">
						Áreas disponíveis
					</h2>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{RELATORIOS_PRODUTOS.map((relatorio) => (
							<Link
								key={relatorio.tipo}
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
						))}
					</div>
				</section>
			</main>
		</PageContainer>
	);
}
