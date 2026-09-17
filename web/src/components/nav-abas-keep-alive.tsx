"use client";

import { usePathname } from "next/navigation";
import { Activity, useEffect, useRef, useState } from "react";
import { useNavAbasAbertasOpcional } from "@/hooks/use-nav-abas-abertas";
import {
	type CachePaginasAbas,
	cachePaginasVazio,
	deveAtualizarNodePagina,
	evictPaginasFechadas,
	ordenarPaginasParaExibicao,
	registrarVisitaPagina,
} from "@/lib/nav-abas-keep-alive";

export function NavAbasKeepAlive({ children }: { children: React.ReactNode }) {
	const pathname = usePathname() ?? "";
	const ctx = useNavAbasAbertasOpcional();
	const nodesRef = useRef(new Map<string, React.ReactNode>());
	const pathnameAnteriorRef = useRef(pathname);
	const [estado, setEstado] = useState<CachePaginasAbas>(cachePaginasVazio);

	const idsAbertos = ctx?.abas.map((aba) => aba.id) ?? [];
	const hidratado = ctx?.hidratado ?? false;

	const proximo = evictPaginasFechadas(
		registrarVisitaPagina(estado, pathnameAnteriorRef.current, pathname),
		pathname,
		idsAbertos,
		hidratado,
	);

	if (proximo !== estado) {
		setEstado(proximo);
	}
	pathnameAnteriorRef.current = pathname;

	const estadoRender = proximo;
	if (deveAtualizarNodePagina(estadoRender.congeladas, pathname)) {
		nodesRef.current.set(pathname, children);
	} else if (!nodesRef.current.has(pathname)) {
		nodesRef.current.set(pathname, children);
	}

	useEffect(() => {
		const vivos = new Set(estadoRender.paths);
		for (const id of nodesRef.current.keys()) {
			if (!vivos.has(id)) {
				nodesRef.current.delete(id);
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
			{ordenarPaginasParaExibicao(paths, pathname).map((path) => (
				<Activity
					key={path}
					mode={path === pathname ? "visible" : "hidden"}
					name={path}
				>
					{nodesRef.current.get(path)}
				</Activity>
			))}
		</>
	);
}
