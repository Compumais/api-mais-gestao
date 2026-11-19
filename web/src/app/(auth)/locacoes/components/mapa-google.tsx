"use client";

import { useEffect, useRef, useState } from "react";
import {
	abrirInfo,
	carregarGoogleMaps,
	criarInfo,
	criarLimites,
	criarMapa,
	criarMarcador,
	type MarcadorMapa,
} from "@/lib/google-maps";
import { cn } from "@/lib/utils";

type Props = {
	marcadores: MarcadorMapa[];
	className?: string;
	ajustarEnquadramento?: boolean;
	focarId?: string | null;
	aoClicar?: (ponto: { latitude: number; longitude: number }) => void;
};

export function MapaGoogle({
	marcadores,
	className,
	ajustarEnquadramento = false,
	focarId,
	aoClicar,
}: Props) {
	const elementoRef = useRef<HTMLDivElement>(null);
	const aoClicarRef = useRef(aoClicar);
	const [pronto, setPronto] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	aoClicarRef.current = aoClicar;

	const mapaRef = useRef<ReturnType<typeof criarMapa> | null>(null);
	const mapsRef = useRef<Awaited<ReturnType<typeof carregarGoogleMaps>> | null>(
		null,
	);
	const infoRef = useRef<ReturnType<typeof criarInfo> | null>(null);
	const marcadoresAtivos = useRef<
		Array<{ id: string; marcador: ReturnType<typeof criarMarcador> }>
	>([]);
	const marcadoresRef = useRef(marcadores);
	marcadoresRef.current = marcadores;
	const chaveMarcadores = marcadores
		.map(
			(item) =>
				`${item.id}:${item.latitude}:${item.longitude}:${item.titulo}:${item.detalhe}`,
		)
		.join("|");

	useEffect(() => {
		const elemento = elementoRef.current;
		if (!elemento) return;
		let cancelado = false;
		void carregarGoogleMaps()
			.then((maps) => {
				if (cancelado || mapaRef.current) return;
				mapsRef.current = maps;
				mapaRef.current = criarMapa(
					maps,
					elemento,
					{ lat: -15.793889, lng: -47.882778 },
					4,
				);
				infoRef.current = criarInfo(maps);
				mapaRef.current.addListener("click", (evento) => {
					const latitude = evento.latLng?.lat();
					const longitude = evento.latLng?.lng();
					if (latitude == null || longitude == null) return;
					aoClicarRef.current?.({ latitude, longitude });
				});
				window.setTimeout(() => maps.event.trigger(mapaRef.current, "resize"), 200);
				setPronto(true);
			})
			.catch((falha: Error) => {
				if (!cancelado) setErro(falha.message);
			});
		return () => {
			cancelado = true;
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: a chave redesenha os marcadores sem recrear o mapa
	useEffect(() => {
		const maps = mapsRef.current;
		const mapa = mapaRef.current;
		const info = infoRef.current;
		if (!pronto || !maps || !mapa || !info) return;

		for (const item of marcadoresAtivos.current) item.marcador.setMap(null);
		marcadoresAtivos.current = [];
		const limites = criarLimites(maps);
		const atuais = marcadoresRef.current;

		for (const item of atuais) {
			const ponto = { lat: item.latitude, lng: item.longitude };
			const marcador = criarMarcador(maps, mapa, ponto);
			marcador.addListener("click", () => {
				abrirInfo(info, mapa, marcador, item.titulo, item.detalhe);
			});
			marcadoresAtivos.current.push({ id: item.id, marcador });
			limites.extend(ponto);
		}

		const foco = atuais.find((item) => item.id === focarId);
		if (foco) {
			mapa.setCenter({ lat: foco.latitude, lng: foco.longitude });
			mapa.setZoom(16);
			const marcador = marcadoresAtivos.current.find(
				(item) => item.id === foco.id,
			)?.marcador;
			if (marcador) abrirInfo(info, mapa, marcador, foco.titulo, foco.detalhe);
			return;
		}

		if (atuais.length === 1 && atuais[0]) {
			mapa.setCenter({
				lat: atuais[0].latitude,
				lng: atuais[0].longitude,
			});
			if (ajustarEnquadramento) mapa.setZoom(16);
			return;
		}

		if (ajustarEnquadramento && atuais.length > 1) {
			mapa.fitBounds(limites);
		}
	}, [ajustarEnquadramento, chaveMarcadores, focarId, pronto]);

	return (
		<div className={cn("relative h-[420px] w-full overflow-hidden rounded-md border", className)}>
			<div ref={elementoRef} className="h-full w-full" />
			{erro && (
				<p className="absolute inset-0 flex items-center justify-center bg-background p-4 text-center text-sm text-muted-foreground">
					{erro}
				</p>
			)}
		</div>
	);
}
