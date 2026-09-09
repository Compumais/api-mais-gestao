/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

const CACHES_DE_PAGINA = [
	"pages-rsc-prefetch",
	"pages-rsc",
	"pages",
	"others",
	"next-data",
];

function ehNavegacaoOuRsc(request: Request): boolean {
	if (request.mode === "navigate" || request.destination === "document") {
		return true;
	}
	return (
		request.headers.get("RSC") === "1" ||
		request.headers.get("Next-Router-Prefetch") === "1" ||
		request.headers.has("Next-Router-State-Tree")
	);
}

function ehApiRemota(url: URL): boolean {
	return (
		url.hostname === "apimaisgestao.compumais.com" ||
		url.hostname === "api.compuchat.space" ||
		url.pathname.startsWith("/api/") ||
		url.pathname === "/health" ||
		url.pathname.startsWith("/pdv/updates/")
	);
}

function nomeCacheDaRegra(regra: RuntimeCaching): string | null {
	const handler = regra.handler;
	if (typeof handler !== "object" || handler == null) {
		return null;
	}
	if ("cacheName" in handler && typeof handler.cacheName === "string") {
		return handler.cacheName;
	}
	return null;
}

const cacheSoDeAssets = defaultCache.filter((regra) => {
	const nome = nomeCacheDaRegra(regra);
	return nome == null || !CACHES_DE_PAGINA.includes(nome);
});

self.addEventListener("activate", (evento) => {
	evento.waitUntil(
		caches.keys().then((chaves) =>
			Promise.all(
				chaves
					.filter((chave) =>
						CACHES_DE_PAGINA.some(
							(nome) => chave === nome || chave.includes(nome),
						),
					)
					.map((chave) => caches.delete(chave)),
			),
		),
	);
});

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	cleanupOutdatedCaches: true,
	navigationPreload: false,
	runtimeCaching: [
		{
			matcher({ request }) {
				return ehNavegacaoOuRsc(request);
			},
			handler: new NetworkOnly(),
		},
		{
			matcher({ url }) {
				return ehApiRemota(url);
			},
			handler: new NetworkOnly(),
		},
		...cacheSoDeAssets,
		{
			matcher: /.*/i,
			handler: new NetworkOnly(),
		},
	],
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					return request.destination === "document";
				},
			},
		],
	},
});

serwist.addEventListeners();
