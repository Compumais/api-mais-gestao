"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	nfeConfiguracaoService,
	type NfeSerie,
} from "@/services/nfe-configuracao.service";

interface NfeSeriesSectionProps {
	idempresa: string;
	modelo: "55" | "65";
	titulo: string;
	descricao?: string;
	queryKey: string;
}

type FormSerie = {
	serie: string;
	numeroproximo: number;
	padrao: boolean;
	ativo: boolean;
};

const formInicial = (): FormSerie => ({
	serie: "1",
	numeroproximo: 1,
	padrao: true,
	ativo: true,
});

export function NfeSeriesSection({
	idempresa,
	modelo,
	titulo,
	descricao,
	queryKey,
}: NfeSeriesSectionProps) {
	const queryClient = useQueryClient();
	const [novaSerie, setNovaSerie] = useState<FormSerie>(formInicial);
	const [serieEditando, setSerieEditando] = useState<NfeSerie | null>(null);
	const [serieExcluindo, setSerieExcluindo] = useState<NfeSerie | null>(null);

	const { data: series = [], isLoading } = useQuery({
		queryKey: [queryKey, idempresa],
		queryFn: () => nfeConfiguracaoService.listarSeries(idempresa, modelo),
	});

	const invalidarSeries = () => {
		queryClient.invalidateQueries({ queryKey: [queryKey, idempresa] });
	};

	const criarMutation = useMutation({
		mutationFn: () => {
			const serie = novaSerie.serie.trim();
			if (!serie) throw new Error("Informe o número da série");
			if (novaSerie.numeroproximo < 1) {
				throw new Error("O próximo número deve ser maior que zero");
			}

			return nfeConfiguracaoService.criarSerie({
				idempresa,
				modelo,
				serie,
				numeroproximo: novaSerie.numeroproximo,
				padrao: novaSerie.padrao,
				ativo: novaSerie.ativo,
			});
		},
		onSuccess: () => {
			toast.success("Série cadastrada");
			setNovaSerie(formInicial());
			invalidarSeries();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao cadastrar série"),
	});

	const salvarEdicaoMutation = useMutation({
		mutationFn: async () => {
			if (!serieEditando) return;
			const serie = serieEditando.serie.trim();
			if (!serie) throw new Error("Informe o número da série");
			if (serieEditando.numeroproximo < 1) {
				throw new Error("O próximo número deve ser maior que zero");
			}

			return nfeConfiguracaoService.atualizarSerie(serieEditando.id, {
				idempresa,
				serie,
				numeroproximo: serieEditando.numeroproximo,
				padrao: serieEditando.padrao,
				ativo: serieEditando.ativo,
			});
		},
		onSuccess: () => {
			toast.success("Série atualizada");
			setSerieEditando(null);
			invalidarSeries();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao atualizar série"),
	});

	const excluirMutation = useMutation({
		mutationFn: (serie: NfeSerie) =>
			nfeConfiguracaoService.excluirSerie(serie.id, idempresa),
		onSuccess: () => {
			toast.success("Série excluída");
			setSerieExcluindo(null);
			invalidarSeries();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao excluir série"),
	});

	const definirPadraoMutation = useMutation({
		mutationFn: (serie: NfeSerie) =>
			nfeConfiguracaoService.atualizarSerie(serie.id, {
				idempresa,
				padrao: true,
				ativo: true,
			}),
		onSuccess: () => {
			toast.success("Série definida como padrão");
			invalidarSeries();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao definir série padrão"),
	});

	return (
		<div className="rounded-lg border bg-card p-6">
			<h2 className="mb-1 text-lg font-semibold">{titulo}</h2>
			{descricao ? (
				<p className="mb-4 text-sm text-muted-foreground">{descricao}</p>
			) : (
				<div className="mb-4" />
			)}

			<div className="grid gap-4 md:grid-cols-4">
				<Field>
					<FieldLabel>Série</FieldLabel>
					<Input
						value={novaSerie.serie}
						maxLength={3}
						onChange={(e) =>
							setNovaSerie((s) => ({ ...s, serie: e.target.value }))
						}
					/>
				</Field>
				<Field>
					<FieldLabel>Próximo número</FieldLabel>
					<Input
						type="number"
						min={1}
						value={novaSerie.numeroproximo}
						onChange={(e) =>
							setNovaSerie((s) => ({
								...s,
								numeroproximo: Number(e.target.value),
							}))
						}
					/>
				</Field>
				<div className="flex items-end">
					<div className="flex items-center gap-2 pb-2">
						<Checkbox
							id={`serie-padrao-nova-${modelo}`}
							checked={novaSerie.padrao}
							onCheckedChange={(checked) =>
								setNovaSerie((s) => ({ ...s, padrao: checked === true }))
							}
						/>
						<label
							htmlFor={`serie-padrao-nova-${modelo}`}
							className="text-sm"
						>
							Série padrão
						</label>
					</div>
				</div>
				<div className="flex items-end">
					<Button
						type="button"
						onClick={() => criarMutation.mutate()}
						disabled={criarMutation.isPending}
					>
						Adicionar série
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="mt-4 flex justify-center py-6">
					<div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : (
				<ul className="mt-4 space-y-2 text-sm">
					{series.map((serie) => {
						const editando = serieEditando?.id === serie.id;

						return (
							<li
								key={serie.id}
								className="rounded border p-3"
							>
								{editando ? (
									<div className="grid gap-3 md:grid-cols-4">
										<Field>
											<FieldLabel>Série</FieldLabel>
											<Input
												value={serieEditando.serie}
												maxLength={3}
												onChange={(e) =>
													setSerieEditando((s) =>
														s ? { ...s, serie: e.target.value } : s,
													)
												}
											/>
										</Field>
										<Field>
											<FieldLabel>Próximo número</FieldLabel>
											<Input
												type="number"
												min={1}
												value={serieEditando.numeroproximo}
												onChange={(e) =>
													setSerieEditando((s) =>
														s
															? {
																	...s,
																	numeroproximo: Number(e.target.value),
																}
															: s,
													)
												}
											/>
										</Field>
										<div className="flex flex-col justify-end gap-2 pb-2">
											<div className="flex items-center gap-2">
												<Checkbox
													id={`serie-padrao-edit-${serie.id}`}
													checked={serieEditando.padrao}
													onCheckedChange={(checked) =>
														setSerieEditando((s) =>
															s
																? { ...s, padrao: checked === true }
																: s,
														)
													}
												/>
												<label htmlFor={`serie-padrao-edit-${serie.id}`}>
													Padrão
												</label>
											</div>
											<div className="flex items-center gap-2">
												<Checkbox
													id={`serie-ativa-edit-${serie.id}`}
													checked={serieEditando.ativo}
													onCheckedChange={(checked) =>
														setSerieEditando((s) =>
															s ? { ...s, ativo: checked === true } : s,
														)
													}
												/>
												<label htmlFor={`serie-ativa-edit-${serie.id}`}>
													Ativa
												</label>
											</div>
										</div>
										<div className="flex items-end gap-2">
											<Button
												type="button"
												size="sm"
												onClick={() => salvarEdicaoMutation.mutate()}
												disabled={salvarEdicaoMutation.isPending}
											>
												Salvar
											</Button>
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setSerieEditando(null)}
											>
												Cancelar
											</Button>
										</div>
									</div>
								) : (
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="font-medium">
												Série {serie.serie} — próximo nº {serie.numeroproximo}
											</p>
											<div className="mt-1 flex flex-wrap gap-2">
												{serie.padrao && (
													<Badge variant="secondary">Padrão</Badge>
												)}
												{serie.ativo ? (
													<Badge>Ativa</Badge>
												) : (
													<Badge variant="outline">Inativa</Badge>
												)}
											</div>
										</div>
										<div className="flex flex-wrap gap-2">
											{!serie.padrao && (
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => definirPadraoMutation.mutate(serie)}
													disabled={definirPadraoMutation.isPending}
												>
													Definir padrão
												</Button>
											)}
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setSerieEditando({ ...serie })}
											>
												Editar
											</Button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => setSerieExcluindo(serie)}
											>
												Excluir
											</Button>
										</div>
									</div>
								)}
							</li>
						);
					})}
					{series.length === 0 && (
						<li className="rounded border border-dashed p-3 text-muted-foreground">
							Nenhuma série cadastrada para o modelo {modelo}.
						</li>
					)}
				</ul>
			)}

			<AlertDialog
				open={!!serieExcluindo}
				onOpenChange={(open) => !open && setSerieExcluindo(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir série?</AlertDialogTitle>
						<AlertDialogDescription>
							A série {serieExcluindo?.serie} será removida permanentemente.
							Não é possível excluir séries que já tenham notas fiscais emitidas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								serieExcluindo && excluirMutation.mutate(serieExcluindo)
							}
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
