function capitalizarPalavra(palavra: string): string {
	if (!palavra) {
		return palavra;
	}

	return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
}

export function formatarRecursoAuditoria(recurso: string): string {
	return recurso
		.split(/[\s_]+/)
		.filter(Boolean)
		.map(capitalizarPalavra)
		.join(" ");
}

function obterVerboAcao(acao: string): string {
	const normalizada = acao.trim().toLowerCase();

	if (normalizada.includes("_")) {
		return normalizada.split("_")[0] ?? normalizada;
	}

	const primeiraPalavra = normalizada.split(/\s+/)[0] ?? normalizada;
	return primeiraPalavra;
}

export function formatarAcaoAuditoria(acao: string): string {
	const verbo = obterVerboAcao(acao);

	if (verbo.startsWith("criar") || verbo.startsWith("registrar")) {
		return "Criação";
	}

	if (
		verbo.startsWith("excluir") ||
		verbo.startsWith("remover") ||
		verbo.startsWith("deletar")
	) {
		return "Deletar";
	}

	if (verbo.startsWith("atualizar") || verbo.startsWith("editar")) {
		return "Editar";
	}

	return formatarRecursoAuditoria(acao);
}
