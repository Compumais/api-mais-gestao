export type CachePaginasAbas = {
	paths: string[];
	congeladas: string[];
};

export function cachePaginasVazio(): CachePaginasAbas {
	return { paths: [], congeladas: [] };
}

export function deveAtualizarNodePagina(
	congeladas: readonly string[],
	pathname: string,
): boolean {
	return Boolean(pathname) && !congeladas.includes(pathname);
}

/**
 * Ao sair de uma rota, congela o último tree para a aba poder voltar
 * com o mesmo estado. A rota atual continua recebendo children novos
 * (loading → conteúdo) até o usuário navegar para outra aba.
 */
export function registrarVisitaPagina(
	estado: CachePaginasAbas,
	pathnameAnterior: string,
	pathname: string,
): CachePaginasAbas {
	if (!pathname) return estado;

	let congeladas = estado.congeladas;
	if (
		pathnameAnterior &&
		pathnameAnterior !== pathname &&
		!congeladas.includes(pathnameAnterior)
	) {
		congeladas = [...congeladas, pathnameAnterior];
	}

	const paths = estado.paths.includes(pathname)
		? estado.paths
		: [...estado.paths, pathname];

	if (paths === estado.paths && congeladas === estado.congeladas) {
		return estado;
	}

	return { paths, congeladas };
}

/**
 * Remove páginas de abas já fechadas. Antes da hidratação do localStorage
 * não poda — a lista de abas ainda está vazia e apagaria o cache ativo.
 */
export function evictPaginasFechadas(
	estado: CachePaginasAbas,
	pathnameAtual: string,
	idsAbertos: readonly string[],
	hidratado: boolean,
): CachePaginasAbas {
	if (!hidratado) return estado;

	const abertos = new Set(idsAbertos);
	const paths = estado.paths.filter(
		(id) => id === pathnameAtual || abertos.has(id),
	);
	if (paths.length === estado.paths.length) return estado;

	const vivos = new Set(paths);
	return {
		paths,
		congeladas: estado.congeladas.filter((id) => vivos.has(id)),
	};
}

export function ordenarPaginasParaExibicao(
	paths: readonly string[],
	pathnameAtivo: string,
): string[] {
	return [...paths].sort((a, b) => {
		if (a === pathnameAtivo) return 1;
		if (b === pathnameAtivo) return -1;
		return 0;
	});
}
