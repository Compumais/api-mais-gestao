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
	ativarAba: (href: string) => void;
	fecharAba: (id: string) => void;
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

	React.useEffect(() => {
		if (!storageKey) {
			setAbas([]);
			setHidratado(true);
			return;
		}
		setAbas(lerAbasAbertas(localStorage.getItem(storageKey)));
		setHidratado(true);
	}, [storageKey]);

	const persistir = React.useCallback(
		(proximas: AbaAberta[]) => {
			setAbas(proximas);
			if (storageKey) {
				localStorage.setItem(storageKey, JSON.stringify(proximas));
			}
		},
		[storageKey],
	);

	React.useEffect(() => {
		if (!hidratado || !pathname) return;
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
			if (iguais) return atuais;
			if (storageKey) {
				localStorage.setItem(storageKey, JSON.stringify(proximas));
			}
			return proximas;
		});
	}, [hidratado, pathname, search, itensNavFixaveis, storageKey]);

	const ativarAba = React.useCallback(
		(href: string) => {
			router.push(href);
		},
		[router],
	);

	const fecharAba = React.useCallback(
		(id: string) => {
			const resultado = fecharAbaAberta(abas, id, pathname);
			persistir(resultado.abas);
			if (resultado.navegarPara) {
				router.push(resultado.navegarPara);
			}
		},
		[abas, pathname, persistir, router],
	);

	const value = React.useMemo(
		() => ({
			abas,
			ativaId: pathname,
			ativarAba,
			fecharAba,
		}),
		[abas, pathname, ativarAba, fecharAba],
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
