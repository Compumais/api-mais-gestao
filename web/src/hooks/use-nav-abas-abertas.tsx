"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useNavFiltrada } from "@/hooks/use-nav-filtrada";
import {
	type AbaAberta,
	chaveNavAbasAbertas,
	fecharAbaAberta,
	lerAbasAbertas,
	registrarAbaAberta,
	resolverTituloAba,
} from "@/lib/nav-abas-abertas";

type NavAbasAbertasContextValue = {
	abas: AbaAberta[];
	ativaId: string;
	hidratado: boolean;
	ativarAba: (href: string) => void;
	fecharAba: (id: string) => void;
	atualizarTituloAba: (id: string, title: string) => void;
	lerRascunho: <T>(id: string) => T | undefined;
	salvarRascunho: (id: string, dados: unknown) => void;
	limparRascunho: (id: string) => void;
};

const NavAbasAbertasContext =
	React.createContext<NavAbasAbertasContextValue | null>(null);

export function NavAbasAbertasProvider({
	userId,
	children,
}: {
	userId?: string;
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname() ?? "";
	const searchParams = useSearchParams();
	const search = searchParams.toString();
	const { itensNavFixaveis } = useNavFiltrada();
	const storageKey = userId ? chaveNavAbasAbertas(userId) : null;
	const [abas, setAbas] = React.useState<AbaAberta[]>([]);
	const [hidratado, setHidratado] = React.useState(false);
	const abasRef = React.useRef<AbaAberta[]>([]);
	const fechandoIdRef = React.useRef<string | null>(null);
	const rascunhosRef = React.useRef(new Map<string, unknown>());

	React.useEffect(() => {
		fechandoIdRef.current = null;
		if (!storageKey) {
			abasRef.current = [];
			setAbas([]);
			setHidratado(true);
			return;
		}
		const iniciais = lerAbasAbertas(localStorage.getItem(storageKey));
		abasRef.current = iniciais;
		setAbas(iniciais);
		setHidratado(true);
	}, [storageKey]);

	React.useEffect(() => {
		if (!hidratado || !pathname) return;
		if (fechandoIdRef.current) {
			if (pathname === fechandoIdRef.current) {
				return;
			}
			fechandoIdRef.current = null;
		}
		const title = resolverTituloAba(pathname, search, itensNavFixaveis);
		setAbas((atuais) => {
			const proximas = registrarAbaAberta(atuais, pathname, search, title);
			const iguais =
				proximas.length === atuais.length &&
				proximas.every(
					(aba, i) =>
						aba.id === atuais[i]?.id &&
						aba.href === atuais[i]?.href &&
						aba.title === atuais[i]?.title,
				);
			if (iguais) {
				abasRef.current = atuais;
				return atuais;
			}
			abasRef.current = proximas;
			if (storageKey) {
				localStorage.setItem(storageKey, JSON.stringify(proximas));
			}
			return proximas;
		});
	}, [hidratado, pathname, search, itensNavFixaveis, storageKey]);

	const ativarAba = React.useCallback(
		(href: string) => {
			fechandoIdRef.current = null;
			React.startTransition(() => {
				router.push(href);
			});
		},
		[router],
	);

	const atualizarTituloAba = React.useCallback(
		(id: string, title: string) => {
			const titulo = title.trim();
			if (!id || !titulo) return;
			setAbas((atuais) => {
				const indice = atuais.findIndex((aba) => aba.id === id);
				if (indice < 0) return atuais;
				const atual = atuais[indice];
				if (atual?.title === titulo && atual.titleLocked) return atuais;
				const proximas = atuais.map((aba) =>
					aba.id === id ? { ...aba, title: titulo, titleLocked: true } : aba,
				);
				abasRef.current = proximas;
				if (storageKey) {
					localStorage.setItem(storageKey, JSON.stringify(proximas));
				}
				return proximas;
			});
		},
		[storageKey],
	);

	const lerRascunho = React.useCallback(<T,>(id: string) => {
		return rascunhosRef.current.get(id) as T | undefined;
	}, []);

	const salvarRascunho = React.useCallback((id: string, dados: unknown) => {
		if (!id) return;
		rascunhosRef.current.set(id, dados);
	}, []);

	const limparRascunho = React.useCallback((id: string) => {
		rascunhosRef.current.delete(id);
	}, []);

	const fecharAba = React.useCallback(
		(id: string) => {
			rascunhosRef.current.delete(id);
			const resultado = fecharAbaAberta(abasRef.current, id, pathname);
			if (id === pathname) {
				fechandoIdRef.current = id;
			}
			abasRef.current = resultado.abas;
			if (storageKey) {
				localStorage.setItem(storageKey, JSON.stringify(resultado.abas));
			}
			setAbas(resultado.abas);
			if (resultado.navegarPara) {
				const destino = resultado.navegarPara;
				const destinoPath = destino.split("?")[0] ?? destino;
				if (destinoPath !== pathname || search !== (destino.split("?")[1] ?? "")) {
					React.startTransition(() => {
						router.push(destino);
					});
				}
			}
		},
		[pathname, search, storageKey, router],
	);

	const value = React.useMemo(
		() => ({
			abas,
			ativaId: pathname,
			hidratado,
			ativarAba,
			fecharAba,
			atualizarTituloAba,
			lerRascunho,
			salvarRascunho,
			limparRascunho,
		}),
		[
			abas,
			pathname,
			hidratado,
			ativarAba,
			fecharAba,
			atualizarTituloAba,
			lerRascunho,
			salvarRascunho,
			limparRascunho,
		],
	);

	return (
		<NavAbasAbertasContext.Provider value={value}>
			{children}
		</NavAbasAbertasContext.Provider>
	);
}

export function useNavAbasAbertas() {
	const ctx = React.useContext(NavAbasAbertasContext);
	if (!ctx) {
		throw new Error(
			"useNavAbasAbertas deve ser usado dentro de NavAbasAbertasProvider",
		);
	}
	return ctx;
}

export function useNavAbasAbertasOpcional() {
	return React.useContext(NavAbasAbertasContext);
}
