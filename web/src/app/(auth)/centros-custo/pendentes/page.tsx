"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	ApropriacaoCentroCustoField,
	type ApropriacaoCentroCustoFieldValue,
} from "@/components/apropriacao-centro-custo-field";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { extractDateOnly } from "@/lib/date";
import {
	type FinanceiroSemApropriacao,
	apropriacaoCentroCustoService,
} from "@/services/apropriacao-centro-custo.service";
import { PageContainer } from "../../components/page-container";

const formatarMoeda = (valor: string | null | undefined) => {
	const n = Number(valor ?? 0);
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number.isNaN(n) ? 0 : n);
};

const apropriacaoInicial: ApropriacaoCentroCustoFieldValue = {
	modo: "unico",
	idcriteriorateio: null,
	linhas: [{ idcentrocusto: "" }],
};

export default function CentrosCustoPendentesPage() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [selecionado, setSelecionado] =
		useState<FinanceiroSemApropriacao | null>(null);
	const [apropriacao, setApropriacao] =
		useState<ApropriacaoCentroCustoFieldValue>(apropriacaoInicial);

	const { data, isLoading } = useQuery({
		queryKey: ["apropriacoes-centro-custo", "pendentes", empresa?.id],
		queryFn: async () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			return apropriacaoCentroCustoService.listarPendentes({
				idempresa: empresa.id,
				limit: 100,
			});
		},
		enabled: !!empresa,
	});

	const salvarMutation = useMutation({
		mutationFn: async () => {
			if (!empresa || !selecionado) {
				throw new Error("Selecione um título");
			}
			const valorTotal = Number(selecionado.valor ?? 0);
			if (apropriacao.modo === "rateio_criterio") {
				if (!apropriacao.idcriteriorateio) {
					throw new Error("Selecione um critério de rateio");
				}
				return apropriacaoCentroCustoService.salvar({
					idempresa: empresa.id,
					origemtipo: "financeiro",
					origemid: selecionado.id,
					regime: "competencia",
					linhas: [],
					idcriteriorateio: apropriacao.idcriteriorateio,
				});
			}

			const linhas = apropriacao.linhas
				.filter((l) => l.idcentrocusto)
				.map((l) => ({
					idcentrocusto: l.idcentrocusto,
					valor:
						apropriacao.modo === "unico"
							? valorTotal
							: l.valor,
					percentual: l.percentual ?? null,
				}));

			if (!linhas.length) {
				throw new Error("Informe ao menos um centro de custo");
			}

			return apropriacaoCentroCustoService.salvar({
				idempresa: empresa.id,
				origemtipo: "financeiro",
				origemid: selecionado.id,
				regime: "competencia",
				linhas,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["apropriacoes-centro-custo", "pendentes"],
			});
			toast.success("Classificação salva!");
			setSelecionado(null);
			setApropriacao(apropriacaoInicial);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao salvar classificação");
		},
	});

	const abrirClassificacao = (item: FinanceiroSemApropriacao) => {
		setSelecionado(item);
		setApropriacao({
			...apropriacaoInicial,
			linhas: [{ idcentrocusto: "", valor: Number(item.valor ?? 0) }],
		});
	};

	const itens = data?.data ?? [];

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 p-4">
					<div>
						<h1 className="text-2xl font-bold">Classificação pendente</h1>
						<p className="text-sm text-muted-foreground">
							Títulos com plano de contas que exige centro de custo.
						</p>
					</div>
					<Button variant="outline" asChild>
						<Link href="/centros-custo">Voltar</Link>
					</Button>
				</div>

				<div className="rounded-lg border bg-card mx-4">
					{!empresa ? (
						<p className="text-center text-muted-foreground py-8">
							Selecione uma empresa
						</p>
					) : isLoading ? (
						<TableSkeleton rows={8} columns={5}>
							<TableCell>Documento</TableCell>
							<TableCell>Emissão</TableCell>
							<TableCell>Vencimento</TableCell>
							<TableCell>Valor</TableCell>
							<TableCell>Ações</TableCell>
						</TableSkeleton>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Documento</TableHead>
									<TableHead>Histórico</TableHead>
									<TableHead>Emissão</TableHead>
									<TableHead>Vencimento</TableHead>
									<TableHead className="text-right">Valor</TableHead>
									<TableHead className="text-right">Ações</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{itens.length ? (
									itens.map((item) => (
										<TableRow key={item.id}>
											<TableCell>{item.documento ?? "—"}</TableCell>
											<TableCell className="max-w-xs truncate">
												{item.historico ?? "—"}
											</TableCell>
											<TableCell>
												{extractDateOnly(item.emissao) ?? "—"}
											</TableCell>
											<TableCell>
												{extractDateOnly(item.vencimento) ?? "—"}
											</TableCell>
											<TableCell className="text-right">
												{formatarMoeda(item.valor)}
											</TableCell>
											<TableCell className="text-right">
												<Button
													size="sm"
													variant="outline"
													onClick={() => abrirClassificacao(item)}
												>
													Classificar
												</Button>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={6} className="h-24 text-center">
											Nenhum título pendente de classificação.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</div>
			</div>

			<Dialog
				open={!!selecionado}
				onOpenChange={(open) => !open && setSelecionado(null)}
			>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Classificar centro de custo</DialogTitle>
					</DialogHeader>
					{selecionado ? (
						<ApropriacaoCentroCustoField
							valorTotal={Number(selecionado.valor ?? 0)}
							value={apropriacao}
							onChange={setApropriacao}
						/>
					) : null}
					<DialogFooter>
						<Button variant="outline" onClick={() => setSelecionado(null)}>
							Cancelar
						</Button>
						<Button
							onClick={() => salvarMutation.mutate()}
							disabled={salvarMutation.isPending}
						>
							Salvar classificação
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	);
}
