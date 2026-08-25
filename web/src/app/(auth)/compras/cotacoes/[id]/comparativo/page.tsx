"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	formatarMoeda,
	formatarQuantidade,
	labelProdutoCotacao,
} from "@/constants/compras-constants";
import { cotacoesCompraService } from "@/services/cotacoes-compra.service";

export default function ComparativoCotacaoPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const id = params.id;
	const [selecoes, setSelecoes] = useState<Record<string, string>>({});

	const { data, isLoading } = useQuery({
		queryKey: ["cotacao-compra", id, "comparativo"],
		queryFn: () => cotacoesCompraService.comparativo(id),
	});

	useEffect(() => {
		if (!data) return;
		const iniciais: Record<string, string> = {};
		for (const item of data.itens) {
			const menor = item.propostas.find((p) => p.menorpreco) ?? item.propostas[0];
			if (menor) iniciais[item.idcotacaoitem] = menor.idproposta;
		}
		setSelecoes(iniciais);
	}, [data]);

	const { mutate: gerar, isPending } = useMutation({
		mutationFn: () =>
			cotacoesCompraService.gerarPedidos(
				id,
				Object.entries(selecoes).map(([idcotacaoitem, idproposta]) => ({
					idcotacaoitem,
					idproposta,
				})),
			),
		onSuccess: () => {
			toast.success("Pedidos de compra gerados");
			router.push("/compras/pedidos");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const fornecedores = useMemo(() => {
		if (!data) return [];
		const mapa = new Map<
			string,
			{ id: string; nome: string; telefone: string }
		>();
		for (const item of data.itens) {
			for (const proposta of item.propostas) {
				mapa.set(proposta.idproposta, {
					id: proposta.idproposta,
					nome: proposta.nome,
					telefone: proposta.telefone,
				});
			}
		}
		return [...mapa.values()];
	}, [data]);

	if (isLoading) {
		return (
			<PageContainer>
				<div className="flex justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</PageContainer>
		);
	}

	if (!data) {
		return (
			<PageContainer>
				<p className="p-8 text-center">Cotação não encontrada.</p>
			</PageContainer>
		);
	}

	const podeGerar =
		data.cotacao.status === "A" && data.itens.some((i) => i.propostas.length > 0);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:py-6">
				<div className="flex items-center justify-between px-4">
					<div>
						<h1 className="text-2xl font-bold">Comparativo de preços</h1>
						<p className="text-muted-foreground">
							Cotação #{data.cotacao.codigo} — {data.cotacao.titulo}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Todos os valores enviados pelos fornecedores. O menor preço de
							cada item aparece destacado em verde.
						</p>
					</div>
					<Button onClick={() => gerar()} disabled={!podeGerar || isPending}>
						{isPending ? "Gerando..." : "Gerar pedidos de compra"}
					</Button>
				</div>
				<div className="mx-4 overflow-x-auto rounded-lg border bg-card">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="min-w-48">Produto</TableHead>
								<TableHead>Qtd</TableHead>
								{fornecedores.map((f) => (
									<TableHead key={f.id} className="min-w-36 text-right">
										<div className="flex flex-col items-end">
											<span>{f.nome}</span>
											{f.telefone ? (
												<span className="text-xs font-normal text-muted-foreground">
													{f.telefone}
												</span>
											) : null}
										</div>
									</TableHead>
								))}
								<TableHead>Escolher fornecedor</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.itens.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={3 + fornecedores.length}
										className="h-24 text-center"
									>
										Nenhum item nesta cotação.
									</TableCell>
								</TableRow>
							) : (
								data.itens.map((item) => (
									<TableRow key={item.idcotacaoitem}>
										<TableCell>{labelProdutoCotacao(item)}</TableCell>
										<TableCell>
											{formatarQuantidade(item.quantidade)}{" "}
											{item.unidademedida ?? ""}
										</TableCell>
										{fornecedores.map((f) => {
											const proposta = item.propostas.find(
												(p) => p.idproposta === f.id,
											);
											const menor = Boolean(proposta?.menorpreco);
											return (
												<TableCell
													key={f.id}
													className={`min-w-36 text-right ${
														menor
															? "bg-emerald-50 dark:bg-emerald-950/40"
															: ""
													}`}
												>
													{proposta ? (
														<div className="flex flex-col items-end gap-1">
															<span
																className={
																	menor
																		? "text-base font-bold text-emerald-700 dark:text-emerald-400"
																		: "font-medium"
																}
															>
																{formatarMoeda(proposta.precounitario)}
															</span>
															{menor ? (
																<Badge className="border-transparent bg-emerald-600 text-white">
																	Menor
																</Badge>
															) : null}
														</div>
													) : (
														<span className="text-muted-foreground">—</span>
													)}
												</TableCell>
											);
										})}
										<TableCell>
											{item.propostas.length > 0 ? (
												<Select
													value={selecoes[item.idcotacaoitem] ?? ""}
													onValueChange={(value) =>
														setSelecoes((atual) => ({
															...atual,
															[item.idcotacaoitem]: value,
														}))
													}
													disabled={data.cotacao.status !== "A"}
												>
													<SelectTrigger className="w-64">
														<SelectValue placeholder="Selecionar" />
													</SelectTrigger>
													<SelectContent>
														{item.propostas.map((p) => (
															<SelectItem
																key={p.idproposta}
																value={p.idproposta}
															>
																{p.nome} — {formatarMoeda(p.precounitario)}
																{p.menorpreco ? " (menor)" : ""}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<span className="text-sm text-muted-foreground">
													Sem propostas
												</span>
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</PageContainer>
	);
}
