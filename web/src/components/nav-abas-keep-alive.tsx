"use client";

import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
	NavigationPromisesContext,
	PathParamsContext,
	PathnameContext,
	SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, useContext, useEffect, useRef, useState } from "react";
import { useNavAbasAbertasOpcional } from "@/hooks/use-nav-abas-abertas";
import {
	type CachePaginasAbas,
	cachePaginasVazio,
	deveRemontarAbaCongelada,
	deveTrocarNodePagina,
	evictPaginasFechadas,
	ordenarPaginasParaExibicao,
	registrarVisitaPagina,
} from "@/lib/nav-abas-keep-alive";

function FrozenRouterPorAba({
	ativa,
	children,
}: {
	ativa: boolean;
	children: React.ReactNode;
}) {
	const layoutRouter = useContext(LayoutRouterContext);
	const pathname = useContext(PathnameContext);
	const searchParams = useContext(SearchParamsContext);
	const pathParams = useContext(PathParamsContext);
	const navigationPromises = useContext(NavigationPromisesContext);

	const congeladoRef = useRef({
		layoutRouter,
		pathname,
		searchParams,
		pathParams,
		navigationPromises,
	});

	if (ativa) {
		congeladoRef.current = {
			layoutRouter,
			pathname,
			searchParams,
			pathParams,
			navigationPromises,
		};
	}

	const ctx = congeladoRef.current;

	return (
		<LayoutRouterContext.Provider value={ctx.layoutRouter}>
			<PathnameContext.Provider value={ctx.pathname}>
				<SearchParamsContext.Provider value={ctx.searchParams}>
					<PathParamsContext.Provider value={ctx.pathParams}>
						<NavigationPromisesContext.Provider value={ctx.navigationPromises}>
							{children}
						</NavigationPromisesContext.Provider>
					</PathParamsContext.Provider>
				</SearchParamsContext.Provider>
			</PathnameContext.Provider>
		</LayoutRouterContext.Provider>
	);
}

export function NavAbasKeepAlive({ children }: { children: React.ReactNode }) {
	const pathname = usePathname() ?? "";
	const search = useSearchParams().toString();
	const ctx = useNavAbasAbertasOpcional();
	const nodesRef = useRef(new Map<string, React.ReactNode>());
	const searchPorPathRef = useRef(new Map<string, string>());
	const versaoPorPathRef = useRef(new Map<string, number>());
	const pathnameAnteriorRef = useRef(pathname);
	const [estado, setEstado] = useState<CachePaginasAbas>(cachePaginasVazio);

	const idsAbertos = ctx?.abas.map((aba) => aba.id) ?? [];
	const hidratado = ctx?.hidratado ?? false;
	const pathnameAnterior = pathnameAnteriorRef.current;

	const proximo = evictPaginasFechadas(
		registrarVisitaPagina(estado, pathnameAnterior, pathname),
		pathname,
		idsAbertos,
		hidratado,
	);

	if (proximo !== estado) {
		setEstado(proximo);
	}
	pathnameAnteriorRef.current = pathname;

	const estadoRender = proximo;
	const searchCacheado = searchPorPathRef.current.get(pathname);

	if (
		deveRemontarAbaCongelada(
			estadoRender.congeladas,
			pathnameAnterior,
			pathname,
			search,
			searchCacheado,
		)
	) {
		versaoPorPathRef.current.set(
			pathname,
			(versaoPorPathRef.current.get(pathname) ?? 0) + 1,
		);
	}

	if (
		deveTrocarNodePagina(
			estadoRender.congeladas,
			pathname,
			search,
			searchCacheado,
		) ||
		!nodesRef.current.has(pathname)
	) {
		nodesRef.current.set(pathname, children);
		searchPorPathRef.current.set(pathname, search);
	}

	useEffect(() => {
		const vivos = new Set(estadoRender.paths);
		for (const id of nodesRef.current.keys()) {
			if (!vivos.has(id)) {
				nodesRef.current.delete(id);
				searchPorPathRef.current.delete(id);
				versaoPorPathRef.current.delete(id);
			}
		}
	}, [estadoRender.paths]);

	if (!ctx) {
		return children;
	}

	const paths = estadoRender.paths.includes(pathname)
		? estadoRender.paths
		: [...estadoRender.paths, pathname];

	return (
		<>
			{ordenarPaginasParaExibicao(paths, pathname).map((path) => {
				const ativa = path === pathname;
				const versao = versaoPorPathRef.current.get(path) ?? 0;
				return (
					<Activity
						key={`${path}:${versao}`}
						mode={ativa ? "visible" : "hidden"}
						name={path}
					>
						<FrozenRouterPorAba ativa={ativa}>
							{nodesRef.current.get(path)}
						</FrozenRouterPorAba>
					</Activity>
				);
			})}
		</>
	);
}
