"use client";

type ComponenteEndereco = {
	long_name: string;
	short_name: string;
	types: string[];
};

type ResultadoGeocode = {
	address_components?: ComponenteEndereco[];
	geometry?: {
		location?: { lat: () => number; lng: () => number };
	};
};

type InstanciaMapa = {
	setCenter: (ponto: { lat: number; lng: number }) => void;
	setZoom: (zoom: number) => void;
	fitBounds: (limites: { extend: (ponto: { lat: number; lng: number }) => void }) => void;
	addListener: (
		evento: string,
		callback: (evento: { latLng?: { lat: () => number; lng: () => number } }) => void,
	) => void;
};

type InstanciaMarcador = {
	setMap: (mapa: InstanciaMapa | null) => void;
	addListener: (evento: string, callback: () => void) => void;
};

type InstanciaInfo = {
	setContent: (conteudo: Node) => void;
	open: (opcoes: { map: InstanciaMapa; anchor: InstanciaMarcador }) => void;
	close: () => void;
};

type GoogleMapsApi = {
	importLibrary: (nome: string) => Promise<Record<string, unknown>>;
	Map: new (elemento: HTMLElement, opcoes: Record<string, unknown>) => InstanciaMapa;
	Marker: new (opcoes: Record<string, unknown>) => InstanciaMarcador;
	InfoWindow: new () => InstanciaInfo;
	LatLngBounds: new () => {
		extend: (ponto: { lat: number; lng: number }) => void;
		isEmpty: () => boolean;
	};
	Geocoder: new () => {
		geocode: (
			pedido: {
				location?: { lat: number; lng: number };
				address?: string;
			},
			callback?: (results: ResultadoGeocode[] | null, status: string) => void,
		) => Promise<{ results?: ResultadoGeocode[] }> | undefined;
	};
	event: { trigger: (instancia: unknown, nome: string) => void };
};

type GoogleMapsWindow = Window & {
	google?: { maps: GoogleMapsApi };
};

export type EnderecoDoPonto = {
	latitude: number;
	longitude: number;
	endereco: string;
	numeroendereco: string;
	bairro: string;
	cep: string;
	idestado: string;
	cidade: string;
};

const GOOGLE_MAPS_API_KEY =
	process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ?? "";

let scriptPromise: Promise<void> | null = null;

export function googleMapsDisponivel() {
	return Boolean(GOOGLE_MAPS_API_KEY);
}

export async function carregarGoogleMaps() {
	if (typeof window === "undefined") {
		throw new Error("Google Maps indisponível no servidor");
	}
	if (!GOOGLE_MAPS_API_KEY) {
		throw new Error("Chave do Google Maps não configurada");
	}

	if (!scriptPromise) {
		scriptPromise = new Promise((resolve, reject) => {
			const scriptId = "google-maps-places-script";
			const existente = document.getElementById(scriptId);
			if (existente) {
				if ((window as GoogleMapsWindow).google?.maps) {
					resolve();
					return;
				}
				existente.addEventListener("load", () => resolve());
				existente.addEventListener("error", () =>
					reject(new Error("Falha ao carregar o Google Maps")),
				);
				return;
			}

			const script = document.createElement("script");
			script.id = scriptId;
			script.async = true;
			script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&v=weekly`;
			script.onload = () => resolve();
			script.onerror = () => {
				scriptPromise = null;
				reject(new Error("Falha ao carregar o Google Maps"));
			};
			document.head.appendChild(script);
		});
	}

	await scriptPromise;
	const maps = (window as GoogleMapsWindow).google?.maps;
	if (!maps?.importLibrary) {
		throw new Error("Google Maps indisponível");
	}
	await maps.importLibrary("maps");
	await maps.importLibrary("geocoding");
	await maps.importLibrary("places");
	return maps;
}

function componente(resultado: ResultadoGeocode | undefined, tipo: string) {
	return resultado?.address_components?.find((item) => item.types.includes(tipo));
}

export function lerEnderecoGeocode(
	resultado: ResultadoGeocode | undefined,
	ponto: { latitude: number; longitude: number },
): EnderecoDoPonto {
	const cep = componente(resultado, "postal_code")?.long_name?.replace(/\D/g, "") ?? "";
	return {
		latitude: ponto.latitude,
		longitude: ponto.longitude,
		endereco: componente(resultado, "route")?.long_name ?? "",
		numeroendereco: componente(resultado, "street_number")?.long_name ?? "",
		bairro:
			componente(resultado, "sublocality_level_1")?.long_name ??
			componente(resultado, "neighborhood")?.long_name ??
			"",
		cep,
		idestado:
			componente(resultado, "administrative_area_level_1")?.short_name ?? "",
		cidade:
			componente(resultado, "administrative_area_level_2")?.long_name ??
			componente(resultado, "locality")?.long_name ??
			"",
	};
}

function pedirGeocode(
	maps: GoogleMapsApi,
	pedido: { location?: { lat: number; lng: number }; address?: string },
) {
	const geocoder = new maps.Geocoder();
	return new Promise<ResultadoGeocode | undefined>((resolve, reject) => {
		let concluido = false;
		const concluir = (resultado?: ResultadoGeocode) => {
			if (concluido) return;
			concluido = true;
			resolve(resultado);
		};
		const falhar = (erro: Error) => {
			if (concluido) return;
			concluido = true;
			reject(erro);
		};
		const retorno = geocoder.geocode(pedido, (results, status) => {
			if (status === "OK" || status === "ZERO_RESULTS") {
				concluir(results?.[0]);
				return;
			}
			falhar(new Error(status));
		});
		if (retorno && typeof retorno.then === "function") {
			retorno.then((resposta) => concluir(resposta.results?.[0])).catch(falhar);
		}
	});
}

export async function geocodificarPonto(latitude: number, longitude: number) {
	const maps = await carregarGoogleMaps();
	const resultado = await pedirGeocode(maps, {
		location: { lat: latitude, lng: longitude },
	});
	return lerEnderecoGeocode(resultado, { latitude, longitude });
}

export async function geocodificarEndereco(endereco: string) {
	const maps = await carregarGoogleMaps();
	const resultado = await pedirGeocode(maps, { address: endereco });
	const local = resultado?.geometry?.location;
	if (!local) return null;
	return lerEnderecoGeocode(resultado, {
		latitude: local.lat(),
		longitude: local.lng(),
	});
}

export type MarcadorMapa = {
	id: string;
	latitude: number;
	longitude: number;
	titulo: string;
	detalhe: string;
};

export type MapaGoogleControle = {
	maps: GoogleMapsApi;
	mapa: InstanciaMapa;
};

export function criarMapa(
	maps: GoogleMapsApi,
	elemento: HTMLElement,
	centro: { lat: number; lng: number },
	zoom: number,
) {
	return new maps.Map(elemento, {
		center: centro,
		zoom,
		mapTypeControl: false,
		streetViewControl: false,
		fullscreenControl: false,
	});
}

export function criarMarcador(
	maps: GoogleMapsApi,
	mapa: InstanciaMapa,
	ponto: { lat: number; lng: number },
) {
	return new maps.Marker({ map: mapa, position: ponto });
}

export function criarInfo(maps: GoogleMapsApi) {
	return new maps.InfoWindow();
}

export function criarLimites(maps: GoogleMapsApi) {
	return new maps.LatLngBounds();
}

export function abrirInfo(
	info: InstanciaInfo,
	mapa: InstanciaMapa,
	marcador: InstanciaMarcador,
	titulo: string,
	detalhe: string,
) {
	const conteudo = document.createElement("div");
	conteudo.style.maxWidth = "240px";
	const tituloEl = document.createElement("strong");
	tituloEl.textContent = titulo;
	const detalheEl = document.createElement("div");
	detalheEl.style.whiteSpace = "pre-line";
	detalheEl.style.marginTop = "4px";
	detalheEl.textContent = detalhe;
	conteudo.append(tituloEl, detalheEl);
	info.setContent(conteudo);
	info.open({ map: mapa, anchor: marcador });
}
