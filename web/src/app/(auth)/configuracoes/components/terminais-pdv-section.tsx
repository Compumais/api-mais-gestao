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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { terminalPdvSchema } from "@/schemas/terminal-pdv.schema";
import {
	type NfeSerie,
	nfeConfiguracaoService,
} from "@/services/nfe-configuracao.service";
import {
	type TerminalPdv,
	terminalPdvService,
} from "@/services/terminal-pdv.service";

const CRIAR_SERIE = "__criar_serie__";

type FormTerminal = {
	numeropdv: string;
	descricao: string;
	idnfeserie: string;
	ativo: boolean;
};

const formInicial = (): FormTerminal => ({
	numeropdv: "1",
	descricao: "",
	idnfeserie: CRIAR_SERIE,
	ativo: true,
});

function parseFormulario(form: FormTerminal) {
	return terminalPdvSchema.parse({
		numeropdv: form.numeropdv,
		descricao: form.descricao.trim() || null,
		idnfeserie: form.idnfeserie === CRIAR_SERIE ? null : form.idnfeserie,
		ativo: form.ativo,
	});
}

interface TerminaisPdvSectionProps {
	idempresa: string;
}

export function TerminaisPdvSection({ idempresa }: TerminaisPdvSectionProps) {
	const queryClient = useQueryClient();
	const [novo, setNovo] = useState<FormTerminal>(formInicial);
	const [editando, setEditando] = useState<
		(TerminalPdv & { idnfeserieSelect: string }) | null
	>(null);
	const [excluindo, setExcluindo] = useState<TerminalPdv | null>(null);

	const { data: terminais = [], isLoading } = useQuery({
		queryKey: ["terminais-pdv", idempresa],
		queryFn: () => terminalPdvService.listar(idempresa),
	});

	const { data: series = [] } = useQuery({
		queryKey: ["nfce-series", idempresa],
		queryFn: () => nfeConfiguracaoService.listarSeries(idempresa, "65"),
	});

	const seriesDisponiveis = (excetoId?: string) =>
		series.filter(
			(serie) =>
				serie.id === excetoId ||
				!terminais.some((terminal) => terminal.idnfeserie === serie.id),
		);

	const invalidar = () => {
		queryClient.invalidateQueries({ queryKey: ["terminais-pdv", idempresa] });
		queryClient.invalidateQueries({ queryKey: ["nfce-series", idempresa] });
	};

	const criarMutation = useMutation({
		mutationFn: () => {
			const dados = parseFormulario(novo);
			return terminalPdvService.criar({ idempresa, ...dados });
		},
		onSuccess: () => {
			toast.success("PDV cadastrado");
			setNovo(formInicial());
			invalidar();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao cadastrar PDV"),
	});

	const salvarEdicaoMutation = useMutation({
		mutationFn: async () => {
			if (!editando) return;
			const dados = parseFormulario({
				numeropdv: String(editando.numeropdv),
				descricao: editando.descricao ?? "",
				idnfeserie: editando.idnfeserieSelect,
				ativo: editando.ativo,
			});
			return terminalPdvService.atualizar(editando.id, {
				idempresa,
				...dados,
			});
		},
		onSuccess: () => {
			toast.success("PDV atualizado");
			setEditando(null);
			invalidar();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao atualizar PDV"),
	});

	const excluirMutation = useMutation({
		mutationFn: (terminal: TerminalPdv) =>
			terminalPdvService.excluir(terminal.id, idempresa),
		onSuccess: () => {
			toast.success("PDV excluído");
			setExcluindo(null);
			invalidar();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao excluir PDV"),
	});

	return (
		<div className="rounded-lg border bg-card p-6">
			<h2 className="mb-1 text-lg font-semibold">Terminais PDV</h2>
			<p className="mb-4 text-sm text-muted-foreground">
				Cada PDV precisa de série NFC-e própria. Use o mesmo número do terminal
				Electron em Configurações. Dois caixas na mesma série geram colisão na
				SEFAZ.
			</p>

			<div className="grid gap-4 md:grid-cols-5">
				<Field>
					<FieldLabel>Nº do PDV</FieldLabel>
					<Input
						type="number"
						min={1}
						max={999}
						value={novo.numeropdv}
						onChange={(e) =>
							setNovo((s) => ({ ...s, numeropdv: e.target.value }))
						}
					/>
				</Field>
				<Field>
					<FieldLabel>Descrição</FieldLabel>
					<Input
						value={novo.descricao}
						maxLength={120}
						placeholder="Caixa 1"
						onChange={(e) =>
							setNovo((s) => ({ ...s, descricao: e.target.value }))
						}
					/>
				</Field>
				<Field>
					<FieldLabel>Série 65</FieldLabel>
					<SelectSerie
						value={novo.idnfeserie}
						series={seriesDisponiveis()}
						onChange={(idnfeserie) => setNovo((s) => ({ ...s, idnfeserie }))}
					/>
				</Field>
				<div className="flex items-end">
					<div className="flex items-center gap-2 pb-2">
						<Checkbox
							id="terminal-pdv-ativo-novo"
							checked={novo.ativo}
							onCheckedChange={(checked) =>
								setNovo((s) => ({ ...s, ativo: checked === true }))
							}
						/>
						<label htmlFor="terminal-pdv-ativo-novo" className="text-sm">
							Ativo
						</label>
					</div>
				</div>
				<div className="flex items-end">
					<Button
						type="button"
						onClick={() => criarMutation.mutate()}
						disabled={criarMutation.isPending}
					>
						Adicionar PDV
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="mt-4 flex justify-center py-6">
					<div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : (
				<ul className="mt-4 space-y-2 text-sm">
					{terminais.map((terminal) => {
						const estaEditando = editando?.id === terminal.id;

						return (
							<li key={terminal.id} className="rounded border p-3">
								{estaEditando && editando ? (
									<div className="grid gap-3 md:grid-cols-5">
										<Field>
											<FieldLabel>Nº do PDV</FieldLabel>
											<Input
												type="number"
												min={1}
												max={999}
												value={editando.numeropdv}
												onChange={(e) =>
													setEditando((s) =>
														s
															? {
																	...s,
																	numeropdv: Number(e.target.value),
																}
															: s,
													)
												}
											/>
										</Field>
										<Field>
											<FieldLabel>Descrição</FieldLabel>
											<Input
												value={editando.descricao ?? ""}
												maxLength={120}
												onChange={(e) =>
													setEditando((s) =>
														s ? { ...s, descricao: e.target.value } : s,
													)
												}
											/>
										</Field>
										<Field>
											<FieldLabel>Série 65</FieldLabel>
											<SelectSerie
												value={editando.idnfeserieSelect}
												series={seriesDisponiveis(editando.idnfeserie)}
												onChange={(idnfeserieSelect) =>
													setEditando((s) =>
														s ? { ...s, idnfeserieSelect } : s,
													)
												}
											/>
										</Field>
										<div className="flex items-end">
											<div className="flex items-center gap-2 pb-2">
												<Checkbox
													id={`terminal-pdv-ativo-${terminal.id}`}
													checked={editando.ativo}
													onCheckedChange={(checked) =>
														setEditando((s) =>
															s ? { ...s, ativo: checked === true } : s,
														)
													}
												/>
												<label
													htmlFor={`terminal-pdv-ativo-${terminal.id}`}
													className="text-sm"
												>
													Ativo
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
												onClick={() => setEditando(null)}
											>
												Cancelar
											</Button>
										</div>
									</div>
								) : (
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="font-medium">
												PDV {terminal.numeropdv}
												{terminal.descricao ? ` — ${terminal.descricao}` : ""}
											</p>
											<p className="text-muted-foreground">
												Série {terminal.serie} · próximo nº{" "}
												{terminal.numeroproximo}
											</p>
											<div className="mt-1 flex flex-wrap gap-2">
												{terminal.ativo ? (
													<Badge>Ativo</Badge>
												) : (
													<Badge variant="outline">Inativo</Badge>
												)}
											</div>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() =>
													setEditando({
														...terminal,
														idnfeserieSelect: terminal.idnfeserie,
													})
												}
											>
												Editar
											</Button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => setExcluindo(terminal)}
											>
												Excluir
											</Button>
										</div>
									</div>
								)}
							</li>
						);
					})}
					{terminais.length === 0 && (
						<li className="rounded border border-dashed p-3 text-muted-foreground">
							Nenhum PDV cadastrado. Cadastre cada caixa com série própria antes
							de emitir NFC-e.
						</li>
					)}
				</ul>
			)}

			<AlertDialog
				open={!!excluindo}
				onOpenChange={(open) => !open && setExcluindo(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir PDV?</AlertDialogTitle>
						<AlertDialogDescription>
							O PDV {excluindo?.numeropdv} será removido. A série NFC-e
							vinculada permanece cadastrada.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => excluindo && excluirMutation.mutate(excluindo)}
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function SelectSerie({
	value,
	series,
	onChange,
}: {
	value: string;
	series: NfeSerie[];
	onChange: (value: string) => void;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger>
				<SelectValue placeholder="Série NFC-e" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={CRIAR_SERIE}>
					Criar série igual ao número do PDV
				</SelectItem>
				{series.map((serie) => (
					<SelectItem key={serie.id} value={serie.id}>
						Série {serie.serie} (próximo {serie.numeroproximo})
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
