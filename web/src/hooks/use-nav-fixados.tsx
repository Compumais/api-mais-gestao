"use client";

import * as React from "react";
import { toast } from "sonner";
import {
	alternarUrlNavFixado,
	chaveNavFixados,
	lerUrlsNavFixados,
	NAV_FIXADOS_MAX,
} from "@/lib/nav-fixados";

type NavFixadosContextValue = {
	urls: string[];
	estaFixado: (url: string) => boolean;
	alternarFixado: (url: string) => void;
};

const NavFixadosContext = React.createContext<NavFixadosContextValue | null>(
	null,
);

export function NavFixadosProvider({
	userId,
	children,
}: {
	userId?: string;
	children: React.ReactNode;
}) {
	const storageKey = userId ? chaveNavFixados(userId) : null;
	const [urls, setUrls] = React.useState<string[]>([]);

	React.useEffect(() => {
		if (!storageKey) {
			setUrls([]);
			return;
		}
		setUrls(lerUrlsNavFixados(localStorage.getItem(storageKey)));
	}, [storageKey]);

	const persistir = React.useCallback(
		(proximas: string[]) => {
			setUrls(proximas);
			if (storageKey) {
				localStorage.setItem(storageKey, JSON.stringify(proximas));
			}
		},
		[storageKey],
	);

	const estaFixado = React.useCallback(
		(url: string) => urls.includes(url),
		[urls],
	);

	const alternarFixado = React.useCallback(
		(url: string) => {
			const resultado = alternarUrlNavFixado(urls, url, NAV_FIXADOS_MAX);
			if (resultado.limiteAtingido) {
				toast.error(
					`Você pode fixar no máximo ${NAV_FIXADOS_MAX} atalhos no menu.`,
				);
				return;
			}
			persistir(resultado.urls);
		},
		[persistir, urls],
	);

	const value = React.useMemo(
		() => ({ urls, estaFixado, alternarFixado }),
		[urls, estaFixado, alternarFixado],
	);

	return (
		<NavFixadosContext.Provider value={value}>
			{children}
		</NavFixadosContext.Provider>
	);
}

export function useNavFixados() {
	const ctx = React.useContext(NavFixadosContext);
	if (!ctx) {
		throw new Error(
			"useNavFixados deve ser usado dentro de NavFixadosProvider",
		);
	}
	return ctx;
}

export function useNavFixadosOpcional() {
	return React.useContext(NavFixadosContext);
}
