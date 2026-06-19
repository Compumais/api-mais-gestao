"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { notaFiscalService } from "@/services/nota-fiscal.service";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { BarraFinalizarImportacao } from "../../components/importacao/barra-finalizar-importacao";
import { CabecalhoNfImportacao } from "../../components/importacao/cabecalho-nf-importacao";
import { GridItensImportacao } from "../../components/importacao/grid-itens-importacao";

export default function RascunhoImportacaoPage() {
	const params = useParams<{ id: string }>();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const idRascunho = params.id;

	const { data, isLoading, isError } = useQuery({
		queryKey: ["rascunho-importacao-nf", idRascunho, empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return notaFiscalService.buscarRascunhoImportacao(idRascunho, empresa.id);
		},
		enabled: !!empresa && !!idRascunho,
	});

	if (!empresa) {
		return (
			<PageContainer>
				<p className="p-4 text-muted-foreground">
					Selecione uma empresa para revisar o rascunho.
				</p>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center gap-3 px-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/nota-fiscal-compra" aria-label="Voltar para listagem">
							<IconArrowLeft className="size-5" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold">Revisão da importação NF-e</h1>
						<p className="text-sm text-muted-foreground">
							Vincule produtos, ajuste conversão e tributos antes de confirmar.
						</p>
					</div>
				</div>

				<div className="mx-4 flex flex-col gap-4">
					{isLoading ? (
						<TableSkeleton rows={5} columns={8}>
							<TableCell>Item</TableCell>
						</TableSkeleton>
					) : isError || !data ? (
						<p className="text-destructive">Rascunho não encontrado ou indisponível.</p>
					) : (
						<>
							<CabecalhoNfImportacao
								idempresa={empresa.id}
								idRascunho={idRascunho}
								nota={data.nota}
								fornecedor={data.fornecedor}
								cfopXmlOperacao={
									data.itens[0]?.dadosimportacao?.cfopXml ??
									data.itens[0]?.cfop ??
									undefined
								}
							/>

							<section className="rounded-lg border bg-card p-4">
								<h2 className="text-lg font-semibold mb-4">Itens da nota</h2>
								<p className="text-sm text-muted-foreground mb-4">
									Linhas verdes: vinculado | vermelhas: pendente | amarelas: novo
									produto
								</p>
								<GridItensImportacao
									idempresa={empresa.id}
									idRascunho={idRascunho}
									itens={data.itens}
								/>
							</section>

							<BarraFinalizarImportacao
								idempresa={empresa.id}
								idRascunho={idRascunho}
								dados={data}
							/>
						</>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
