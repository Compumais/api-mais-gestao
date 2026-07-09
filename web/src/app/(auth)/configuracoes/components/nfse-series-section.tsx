"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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

	const criarMutation = useMutation({
		mutationFn: () =>
			nfseConfiguracaoService.criarSerie({
				idempresa,
				serie: novaSerie,
				numeroproximo: Number(proximoNumero) || 1,
				padrao: series.length === 0,
			}),
		onSuccess: () => {
			toast.success("Série RPS criada");
			setNovaSerie("");
			queryClient.invalidateQueries({ queryKey: ["nfse-series", idempresa] });
		},
		onError: () => toast.error("Erro ao criar série RPS"),
	});

	return (
		<section className="space-y-4">
			<h2 className="text-lg font-semibold">Séries RPS</h2>
			<ul className="text-sm space-y-1">
				{series.length === 0 ? (
					<li className="text-muted-foreground">Nenhuma série cadastrada</li>
				) : (
					series.map((s) => (
						<li key={s.id}>
							Série {s.serie} — próximo nº {s.numeroproximo}
							{s.padrao ? " (padrão)" : ""}
						</li>
					))
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
					disabled={!novaSerie || criarMutation.isPending}
					onClick={() => criarMutation.mutate()}
				>
					Adicionar série
				</Button>
			</div>
		</section>
	);
}
