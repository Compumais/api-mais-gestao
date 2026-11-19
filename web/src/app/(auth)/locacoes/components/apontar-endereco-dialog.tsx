"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	type EnderecoDoPonto,
	geocodificarEndereco,
	geocodificarPonto,
	googleMapsDisponivel,
} from "@/lib/google-maps";
import { localidadesService } from "@/services/localidades.service";
import { MapaGoogle } from "./mapa-google";

export type PontoLocacao = EnderecoDoPonto & {
	idcidade: string;
	leuEndereco: boolean;
};

function normalizar(valor: string) {
	return valor
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

type Props = {
	aberto: boolean;
	onFechar: () => void;
	latitude: number | null;
	longitude: number | null;
	enderecoAtual: string;
	onConfirmar: (ponto: PontoLocacao) => void;
};

export function ApontarEnderecoDialog({
	aberto,
	onFechar,
	latitude,
	longitude,
	enderecoAtual,
	onConfirmar,
}: Props) {
	const [ponto, setPonto] = useState<EnderecoDoPonto | null>(null);
	const [busca, setBusca] = useState(enderecoAtual);
	const [buscando, setBuscando] = useState(false);
	const [confirmando, setConfirmando] = useState(false);

	async function marcar(latitudeNova: number, longitudeNova: number) {
		setBuscando(true);
		try {
			const endereco = await geocodificarPonto(latitudeNova, longitudeNova);
			setPonto(endereco);
		} catch {
			setPonto({
				latitude: latitudeNova,
				longitude: longitudeNova,
				endereco: "",
				numeroendereco: "",
				bairro: "",
				cep: "",
				idestado: "",
				cidade: "",
			});
			toast.error("Não foi possível ler o endereço deste ponto");
		} finally {
			setBuscando(false);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: só posiciona o mapa ao abrir
	useEffect(() => {
		if (!aberto) return;
		setBusca(enderecoAtual);
		if (latitude != null && longitude != null) {
			void marcar(latitude, longitude);
		}
	}, [aberto]);

	async function buscarEndereco() {
		const termo = busca.trim();
		if (termo.length < 3) return;
		setBuscando(true);
		try {
			const endereco = await geocodificarEndereco(termo);
			if (!endereco) {
				toast.error("Endereço não encontrado no mapa");
				return;
			}
			setPonto(endereco);
		} catch {
			toast.error("Não foi possível buscar o endereço");
		} finally {
			setBuscando(false);
		}
	}

	async function confirmar() {
		if (!ponto) return;
		setConfirmando(true);
		try {
			let idcidade = "";
			if (ponto.idestado && ponto.cidade) {
				const porNome = await localidadesService.listarMunicipios(
					ponto.idestado,
					ponto.cidade,
				);
				const alvo = normalizar(ponto.cidade);
				idcidade =
					porNome.data.find((cidade) => normalizar(cidade.nome) === alvo)
						?.idcidade ?? "";
				if (!idcidade) {
					const todos = await localidadesService.listarMunicipios(ponto.idestado);
					idcidade =
						todos.data.find((cidade) => normalizar(cidade.nome) === alvo)
							?.idcidade ?? "";
				}
			}
			onConfirmar({
				...ponto,
				idcidade,
				leuEndereco: Boolean(ponto.endereco || ponto.cidade || ponto.cep),
			});
			onFechar();
		} finally {
			setConfirmando(false);
		}
	}

	const marcadores = ponto
		? [
				{
					id: "ponto",
					latitude: ponto.latitude,
					longitude: ponto.longitude,
					titulo: "Alocação",
					detalhe: [ponto.endereco, ponto.numeroendereco]
						.filter(Boolean)
						.join(", "),
				},
			]
		: [];

	return (
		<Dialog open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
			<DialogContent className="sm:max-w-3xl text-sm">
				<DialogHeader>
					<DialogTitle>Apontar no mapa</DialogTitle>
				</DialogHeader>
				<div className="grid gap-3">
					<div className="flex gap-2">
						<div className="flex-1">
							<Label htmlFor="busca-mapa">Buscar endereço</Label>
							<Input
								id="busca-mapa"
								value={busca}
								onChange={(evento) => setBusca(evento.target.value)}
								onKeyDown={(evento) => {
									if (evento.key === "Enter") {
										evento.preventDefault();
										void buscarEndereco();
									}
								}}
								placeholder="Rua, número, cidade"
							/>
						</div>
						<Button
							type="button"
							variant="outline"
							className="mt-5"
							disabled={buscando}
							onClick={() => void buscarEndereco()}
						>
							Buscar
						</Button>
					</div>
					<p className="text-muted-foreground">
						Clique no mapa para marcar onde o equipamento está.
					</p>
					{aberto && googleMapsDisponivel() ? (
						<MapaGoogle
							marcadores={marcadores}
							ajustarEnquadramento
							aoClicar={(clique) =>
								void marcar(clique.latitude, clique.longitude)
							}
						/>
					) : (
						<p>
							Configure NEXT_PUBLIC_GOOGLE_PLACES_API_KEY para apontar o
							endereço no Google Maps.
						</p>
					)}
					{ponto && (
						<p>
							{[ponto.endereco, ponto.numeroendereco, ponto.bairro, ponto.cidade, ponto.idestado]
								.filter(Boolean)
								.join(", ") || "Ponto marcado, sem endereço legível"}
						</p>
					)}
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onFechar}>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={!ponto || confirmando || buscando}
						onClick={() => void confirmar()}
					>
						Usar este ponto
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
