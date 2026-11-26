"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { formatCurrency } from "@/app/(auth)/components/financeiro-lista-colunas";
import { DialogConciliarTitulo } from "@/app/(auth)/conciliacao/cielo/components/dialog-conciliar-titulo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type ConciliacaoCieloItem,
	conciliacaoCieloService,
} from "@/services/conciliacao-cielo.service";
import { contasCorrentesService } from "@/services/contas-correntes.service";

function formatarData(valor: string | null | undefined) {
	if (!valor) return "-";
	const data = valor.slice(0, 10);
	const [ano, mes, dia] = data.split("-");
	if (!ano || !mes || !dia) return valor;
	return `${dia}/${mes}/${ano}`;
}

export default function ConciliacaoCieloDetalhePage() {
	const params = useParams<{ id: string }>();
	const id = params.id;
	const { empresa } = useEmpresa();
	const queryClient = useQueryClient();
	const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
	const [idcontacorrente, setIdContaCorrente] = useState("");
	const [itemConciliando, setItemConciliando] =
		useState<ConciliacaoCieloItem | null>(null);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["conciliacao-cielo", id, empresa?.id],
		enabled: Boolean(empresa?.id && id),
		queryFn: () => conciliacaoCieloService.buscar(id, empresa!.id),
	});

	const { data: contasData } = useQuery({
		queryKey: ["contas-correntes", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () =>
			contasCorrentesService.listar({
				idempresa: empresa!.id,
				limit: 100,
			}),
	});

	const itens = data?.itens ?? [];
	const associadosSelecionaveis = itens.filter(
		(item) =>
			item.idfinanceiro &&
			(item.statusprocessamento === "associado" ||
				item.statusprocessamento === "pendente" ||
				item.statusprocessamento === "erro"),
	);

	const associar = useMutation({
		mutationFn: (payload: { iditem: string; idfinanceiro: string | null }) =>
			conciliacaoCieloService.associar(payload.iditem, {
				idempresa: empresa!.id,
				idfinanceiro: payload.idfinanceiro,
			}),
		onSuccess: (_data, variables) => {
			refetch();
			setItemConciliando(null);
			if (variables.idfinanceiro) {
				setSelecionados((atual) => new Set(atual).add(variables.iditem));
				toast.success("Lançamento associado ao título");
			} else {
				setSelecionados((atual) => {
					const proximo = new Set(atual);
					proximo.delete(variables.iditem);
					return proximo;
				});
				toast.success("Associação removida");
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao associar");
		},
	});

	const confirmar = useMutation({
		mutationFn: () => {
			if (!empresa) throw new Error("Empresa não selecionada");
			if (!idcontacorrente) throw new Error("Selecione a conta corrente");
			const ids =
				selecionados.size > 0
					? Array.from(selecionados)
					: associadosSelecionaveis.map((i) => i.id);
			if (ids.length === 0) {
				throw new Error("Selecione ao menos um item associado para baixar");
			}
			return conciliacaoCieloService.confirmar(id, {
				idempresa: empresa.id,
				idcontacorrente,
				idsitens: ids,
				baixarTitulos: true,
			});
		},
		onSuccess: (resultado) => {
			queryClient.invalidateQueries({ queryKey: ["conciliacao-cielo", id] });
			queryClient.invalidateQueries({ queryKey: ["conciliacoes-cielo"] });
			queryClient.invalidateQueries({ queryKey: ["financeiro"] });
			queryClient.invalidateQueries({ queryKey: ["busca-titulos-cielo"] });
			setSelecionados(new Set());
			toast.success(
				`Baixados: ${resultado.confirmados} · Ignorados: ${resultado.ignorados} · Erros: ${resultado.erros}`,
			);
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao confirmar conciliação");
		},
	});

	function toggleItem(item: ConciliacaoCieloItem, checked: boolean) {
		setSelecionados((atual) => {
			const proximo = new Set(atual);
			if (checked) proximo.add(item.id);
			else proximo.delete(item.id);
			return proximo;
		});
	}

	function toggleTodos(checked: boolean) {
		if (!checked) {
			setSelecionados(new Set());
			return;
		}
		setSelecionados(new Set(associadosSelecionaveis.map((i) => i.id)));
	}

	if (!empresa) {
		return (
			<PageContainer>
				<div className="flex items-center justify-center py-8 px-4">
					<p className="text-muted-foreground">Selecione uma empresa.</p>
				</div>
			</PageContainer>
		);
	}

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center gap-3 px-4">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/conciliacao/cielo" aria-label="Voltar">
							<IconArrowLeft className="size-5" />
						</Link>
					</Button>
					<div className="flex-1">
						<h1 className="text-2xl font-bold">Conciliação Cielo</h1>
						{data?.conciliacao && (
							<p className="text-sm text-muted-foreground">
								{data.conciliacao.nomearquivo} · {data.conciliacao.status} ·{" "}
								{data.conciliacao.qtdlancamentos} lançamentos · Líquido{" "}
								{formatCurrency(data.conciliacao.valorliquido)}
							</p>
						)}
					</div>
				</div>

				<div className="rounded-lg border bg-card p-4 mx-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="flex flex-col gap-2 w-full max-w-md">
						<label className="text-sm font-medium" htmlFor="conta-corrente">
							Conta corrente para baixa
						</label>
						<Select value={idcontacorrente} onValueChange={setIdContaCorrente}>
							<SelectTrigger id="conta-corrente">
								<SelectValue placeholder="Selecione a conta" />
							</SelectTrigger>
							<SelectContent>
								{(contasData?.data ?? []).map((conta) => (
									<SelectItem key={conta.id} value={conta.id}>
										{conta.descricao || conta.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button
						disabled={confirmar.isPending || isLoading}
						onClick={() => confirmar.mutate()}
					>
						{confirmar.isPending
							? "Baixando títulos..."
							: `Confirmar conciliação e baixar${
									selecionados.size > 0 ? ` (${selecionados.size})` : ""
								}`}
					</Button>
				</div>

				<div className="px-4">
					<div className="rounded-lg border bg-card overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10">
										<Checkbox
											checked={
												associadosSelecionaveis.length > 0 &&
												associadosSelecionaveis.every((i) =>
													selecionados.has(i.id),
												)
											}
											onCheckedChange={(v) => toggleTodos(Boolean(v))}
											aria-label="Selecionar todos associados"
										/>
									</TableHead>
									<TableHead>Venda</TableHead>
									<TableHead>NSU / Auth</TableHead>
									<TableHead>Bandeira</TableHead>
									<TableHead>Bruto</TableHead>
									<TableHead>Líquido</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="min-w-[260px]">Conta a receber</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading && (
									<TableRow>
										<TableCell colSpan={8}>Carregando...</TableCell>
									</TableRow>
								)}
								{itens.map((item) => {
									const podeSelecionar = Boolean(
										item.idfinanceiro &&
											item.statusprocessamento !== "confirmado",
									);
									const confirmado = item.statusprocessamento === "confirmado";
									return (
										<TableRow key={item.id}>
											<TableCell>
												<Checkbox
													disabled={!podeSelecionar}
													checked={selecionados.has(item.id)}
													onCheckedChange={(v) =>
														toggleItem(item, Boolean(v))
													}
													aria-label={`Selecionar linha ${item.linhacsv}`}
												/>
											</TableCell>
											<TableCell>{formatarData(item.datavenda)}</TableCell>
											<TableCell>
												<div className="text-sm">
													<div>{item.nsu || "-"}</div>
													<div className="text-muted-foreground">
														{item.codigoautorizacao || "-"}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<div className="text-sm">
													<div>{item.bandeira || "-"}</div>
													<div className="text-muted-foreground">
														{item.formapagamento || item.modalidade || ""}
													</div>
												</div>
											</TableCell>
											<TableCell>{formatCurrency(item.valorbruto)}</TableCell>
											<TableCell>{formatCurrency(item.valorliquido)}</TableCell>
											<TableCell>
												<div className="text-sm">
													<div>{item.statusprocessamento}</div>
													{item.confiancasugestao > 0 && (
														<div className="text-muted-foreground">
															sugestão {item.confiancasugestao}%
														</div>
													)}
													{item.mensagemerro && (
														<div className="text-xs text-muted-foreground max-w-[160px] truncate">
															{item.mensagemerro}
														</div>
													)}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-col gap-2">
													{item.idfinanceiro ? (
														<div className="text-sm">
															<div className="font-medium">
																{item.documento || item.idfinanceiro}
															</div>
															<div className="text-muted-foreground">
																{item.nomecliente || item.historico || ""}
															</div>
															<div className="text-muted-foreground">
																{formatCurrency(
																	item.saldofinanceiro ?? item.valorfinanceiro,
																)}
															</div>
														</div>
													) : (
														<span className="text-sm text-muted-foreground">
															Sem associação
														</span>
													)}
													{!confirmado && (
														<Button
															size="sm"
															variant="outline"
															className="w-fit"
															onClick={() => setItemConciliando(item)}
														>
															Conciliar
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>

			{itemConciliando && (
				<DialogConciliarTitulo
					aberto={Boolean(itemConciliando)}
					onAbertoChange={(aberto) => {
						if (!aberto) setItemConciliando(null);
					}}
					idempresa={empresa.id}
					nsu={itemConciliando.nsu}
					autorizacao={itemConciliando.codigoautorizacao}
					valorBruto={itemConciliando.valorbruto}
					idfinanceiroAtual={itemConciliando.idfinanceiro}
					salvando={associar.isPending}
					onConfirmar={(idfinanceiro) =>
						associar.mutate({
							iditem: itemConciliando.id,
							idfinanceiro,
						})
					}
				/>
			)}
		</PageContainer>
	);
}
