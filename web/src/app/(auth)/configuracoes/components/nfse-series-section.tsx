"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NfseSerie } from "@/services/nfse-configuracao.service";
import { nfseConfiguracaoService } from "@/services/nfse-configuracao.service";

interface NfseSeriesSectionProps {
	idempresa: string;
	series: NfseSerie[];
}

export function NfseSeriesSection({ idempresa, series }: NfseSeriesSectionProps) {
	const queryClient = useQueryClient();
	const [novaSerie, setNovaSerie] = useState("");
	const [proximoNumero, setProximoNumero] = useState("1");
	const [serieEditando, setSerieEditando] = useState<NfseSerie | null>(null);

	const invalidar = () => {
		queryClient.invalidateQueries({ queryKey: ["nfse-series", idempresa] });
	};

	const salvarMutation = useMutation({
		mutationFn: () => {
			const serie = novaSerie.trim();
			const jaExistia = series.some((s) => s.serie === serie);
			return nfseConfiguracaoService
				.criarSerie({
					idempresa,
					serie,
					numeroproximo: Number(proximoNumero) || 1,
					padrao: series.length === 0,
				})
				.then((registro) => ({ registro, jaExistia }));
		},
		onSuccess: ({ registro, jaExistia }) => {
			toast.success(
				jaExistia
					? `Numeração da série ${registro.serie} atualizada`
					: "Série RPS criada",
			);
			setNovaSerie("");
			setProximoNumero("1");
			invalidar();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao salvar série RPS"),
	});

	const editarMutation = useMutation({
		mutationFn: async () => {
			if (!serieEditando) return;
			return nfseConfiguracaoService.atualizarSerie(serieEditando.id, {
				idempresa,
				serie: serieEditando.serie.trim(),
				numeroproximo: Number(serieEditando.numeroproximo) || 1,
				padrao: serieEditando.padrao,
				ativo: serieEditando.ativo,
			});
		},
		onSuccess: () => {
			toast.success("Série atualizada");
			setSerieEditando(null);
			invalidar();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao atualizar série RPS"),
	});

	const definirPadraoMutation = useMutation({
		mutationFn: (serie: NfseSerie) =>
			nfseConfiguracaoService.atualizarSerie(serie.id, {
				idempresa,
				padrao: true,
				ativo: true,
			}),
		onSuccess: () => {
			toast.success("Série definida como padrão");
			invalidar();
		},
		onError: (error: Error) =>
			toast.error(error.message || "Erro ao definir série padrão"),
	});

	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold">Séries RPS / DPS</h2>
				<p className="text-muted-foreground text-sm">
					Se a série já existir, informar o mesmo número e um novo &quot;próximo
					nº&quot; atualiza a numeração.
				</p>
			</div>

			<ul className="space-y-2 text-sm">
				{series.length === 0 ? (
					<li className="text-muted-foreground">Nenhuma série cadastrada</li>
				) : (
					series.map((s) => {
						const editando = serieEditando?.id === s.id;

						return (
							<li key={s.id} className="rounded-md border p-3">
								{editando && serieEditando ? (
									<div className="flex flex-wrap items-end gap-2">
										<div>
											<label
												htmlFor={`edit-serie-${s.id}`}
												className="text-sm font-medium"
											>
												Série
											</label>
											<Input
												id={`edit-serie-${s.id}`}
												value={serieEditando.serie}
												maxLength={5}
												className="w-24"
												onChange={(e) =>
													setSerieEditando({
														...serieEditando,
														serie: e.target.value,
													})
												}
											/>
										</div>
										<div>
											<label
												htmlFor={`edit-prox-${s.id}`}
												className="text-sm font-medium"
											>
												Próximo nº
											</label>
											<Input
												id={`edit-prox-${s.id}`}
												type="number"
												min={1}
												className="w-28"
												value={serieEditando.numeroproximo}
												onChange={(e) =>
													setSerieEditando({
														...serieEditando,
														numeroproximo: Number(e.target.value) || 1,
													})
												}
											/>
										</div>
										<Button
											type="button"
											size="sm"
											disabled={editarMutation.isPending}
											onClick={() => editarMutation.mutate()}
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
								) : (
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex flex-wrap items-center gap-2">
											<span>
												Série {s.serie} — próximo nº {s.numeroproximo}
											</span>
											{s.padrao ? <Badge variant="secondary">Padrão</Badge> : null}
										</div>
										<div className="flex flex-wrap gap-2">
											{!s.padrao ? (
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={definirPadraoMutation.isPending}
													onClick={() => definirPadraoMutation.mutate(s)}
												>
													Definir padrão
												</Button>
											) : null}
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setSerieEditando({ ...s })}
											>
												Editar numeração
											</Button>
										</div>
									</div>
								)}
							</li>
						);
					})
				)}
			</ul>

			<div className="flex flex-wrap gap-2 items-end">
				<div>
					<label htmlFor="serie-rps" className="text-sm font-medium">
						Série
					</label>
					<Input
						id="serie-rps"
						value={novaSerie}
						onChange={(e) => setNovaSerie(e.target.value)}
						maxLength={5}
						className="w-24"
					/>
				</div>
				<div>
					<label htmlFor="proximo-rps" className="text-sm font-medium">
						Próximo nº
					</label>
					<Input
						id="proximo-rps"
						type="number"
						min={1}
						value={proximoNumero}
						onChange={(e) => setProximoNumero(e.target.value)}
						className="w-28"
					/>
				</div>
				<Button
					type="button"
					variant="secondary"
					disabled={!novaSerie.trim() || salvarMutation.isPending}
					onClick={() => salvarMutation.mutate()}
				>
					Salvar série / numeração
				</Button>
			</div>
		</section>
	);
}
