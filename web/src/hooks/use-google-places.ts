"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { carregarGoogleMaps, googleMapsDisponivel } from "@/lib/google-maps";

type GoogleMapsWindow = Window & {
	google?: {
		maps: {
			places: {
				AutocompleteSessionToken: new () => unknown;
				AutocompleteSuggestion: {
					fetchAutocompleteSuggestions: (request: {
						input: string;
						sessionToken: unknown;
						includedRegionCodes?: string[];
						includedPrimaryTypes?: string[];
						locationRestriction?: {
							west: number;
							north: number;
							east: number;
							south: number;
						};
					}) => Promise<{
						suggestions: Array<{
							placePrediction?: {
								placeId: string;
								text: { text: string };
								structuredFormat?: {
									mainText: { text: string };
									secondaryText?: { text: string };
								};
							};
						}>;
					}>;
				};
				Place: new (options: {
					id: string;
				}) => {
					fetchFields: (options: { fields: string[] }) => Promise<{
						place: {
							addressComponents?: Array<{
								longText: string;
								shortText: string;
								types: string[];
							}>;
							formattedAddress?: string;
						};
					}>;
				};
			};
		};
	};
};

export type EnderecoSugestao = {
	endereco: string;
	bairro: string | null;
	idestado: string | null;
	idcidade: string | null;
	cep: string | null;
};

function carregarGooglePlacesScript() {
	return carregarGoogleMaps();
}

export function isGooglePlacesDisponivel(): boolean {
	return googleMapsDisponivel();
}

export function useGooglePlacesAutocomplete({
	habilitado,
	idestado,
	onSelecionar,
}: {
	habilitado: boolean;
	idestado?: string | null;
	onSelecionar: (endereco: EnderecoSugestao) => void;
}) {
	const [sugestoes, setSugestoes] = useState<string[]>([]);
	const [carregando, setCarregando] = useState(false);
	const [pronto, setPronto] = useState(false);
	const sessionTokenRef = useRef<unknown>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (!habilitado || !isGooglePlacesDisponivel()) {
			setPronto(false);
			return;
		}

		carregarGooglePlacesScript()
			.then(() => setPronto(true))
			.catch(() => setPronto(false));
	}, [habilitado]);

	const buscarSugestoes = useCallback(
		(termo: string) => {
			if (!pronto || !habilitado || termo.trim().length < 3) {
				setSugestoes([]);
				return;
			}

			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}

			debounceRef.current = setTimeout(async () => {
				try {
					setCarregando(true);
					const googleWindow = window as GoogleMapsWindow;
					const places = googleWindow.google?.maps.places;
					if (!places?.AutocompleteSuggestion) {
						setSugestoes([]);
						return;
					}

					if (!sessionTokenRef.current) {
						sessionTokenRef.current = new places.AutocompleteSessionToken();
					}

					const request: Parameters<
						typeof places.AutocompleteSuggestion.fetchAutocompleteSuggestions
					>[0] = {
						input: termo,
						sessionToken: sessionTokenRef.current,
						includedRegionCodes: ["br"],
						includedPrimaryTypes: ["route", "street_address"],
					};

					const resultado =
						await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
							request,
						);

					const textos = resultado.suggestions
						.map(
							(sugestao) =>
								sugestao.placePrediction?.structuredFormat?.mainText.text ??
								sugestao.placePrediction?.text.text,
						)
						.filter((texto): texto is string => Boolean(texto));

					setSugestoes(textos);
				} catch (error) {
					console.error("Erro ao buscar sugestões do Google Places:", error);
					setSugestoes([]);
				} finally {
					setCarregando(false);
				}
			}, 300);
		},
		[habilitado, pronto],
	);

	const selecionarSugestao = useCallback(
		async (indice: number, termoAtual: string) => {
			const googleWindow = window as GoogleMapsWindow;
			const places = googleWindow.google?.maps.places;
			if (!places?.AutocompleteSuggestion || !places.Place) return;

			try {
				const request: Parameters<
					typeof places.AutocompleteSuggestion.fetchAutocompleteSuggestions
				>[0] = {
					input: termoAtual,
					sessionToken: sessionTokenRef.current,
					includedRegionCodes: ["br"],
					includedPrimaryTypes: ["route", "street_address"],
				};

				const resultado =
					await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
						request,
					);

				const placeId = resultado.suggestions[indice]?.placePrediction?.placeId;
				if (!placeId) return;

				const place = new places.Place({ id: placeId });
				const detalhes = await place.fetchFields({
					fields: ["addressComponents", "formattedAddress"],
				});

				const componentes = detalhes.place.addressComponents ?? [];
				const obterComponente = (tipo: string) =>
					componentes.find((componente) => componente.types.includes(tipo));

				const route = obterComponente("route")?.longText ?? termoAtual;
				const bairro =
					obterComponente("sublocality_level_1")?.longText ??
					obterComponente("neighborhood")?.longText ??
					null;
				const uf =
					obterComponente("administrative_area_level_1")?.shortText ?? null;
				const cep =
					obterComponente("postal_code")?.longText?.replace(/\D/g, "") ?? null;

				if (idestado && uf && idestado.toUpperCase() !== uf.toUpperCase()) {
					return;
				}

				onSelecionar({
					endereco: route,
					bairro,
					idestado: uf,
					idcidade: null,
					cep,
				});

				sessionTokenRef.current = new places.AutocompleteSessionToken();
				setSugestoes([]);
			} catch (error) {
				console.error("Erro ao selecionar endereço do Google Places:", error);
			}
		},
		[idestado, onSelecionar],
	);

	return {
		sugestoes,
		carregando,
		pronto,
		buscarSugestoes,
		selecionarSugestao,
		limparSugestoes: () => setSugestoes([]),
	};
}
