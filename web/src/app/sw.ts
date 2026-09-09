/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

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

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	cleanupOutdatedCaches: true,
	navigationPreload: true,
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
		...defaultCache,
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
