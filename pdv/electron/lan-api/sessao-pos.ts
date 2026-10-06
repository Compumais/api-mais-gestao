/** Regras puras: o login do POS não pode reescrever a sessão do caixa. */

export function sessaoPdvProntaParaPos(sessao: {
	token: string | null;
	idempresa: string | null;
}): boolean {
	return Boolean(sessao.token && sessao.idempresa);
}

/**
 * Lista vazia significa que não deu para resolver as empresas do operador
 * (rede fora, cache ausente). Nesse caso o POS segue na empresa já aberta
 * no PDV, sem trocar o operador. Lista preenchida sem a empresa do caixa
 * recusa o login.
 */
export function operadorCompativelComEmpresa(
	empresas: Array<{ id: string }>,
	idempresaPdv: string,
): boolean {
	if (empresas.length === 0) return true;
	return empresas.some((empresa) => empresa.id === idempresaPdv);
}

/** Nome do garçom do POS para a comanda. Não usa o operador do caixa. */
export function resolverGarcomPos(
	informado: string | null | undefined,
	doTerminal: string | null | undefined,
): string | null {
	const nome = (informado ?? "").trim() || (doTerminal ?? "").trim();
	if (!nome) return null;
	return nome.slice(0, 80);
}

export function empresaPosConfere(
	idempresaInformada: string,
	idempresaPdv: string | null,
): "ok" | "pdv_sem_empresa" | "empresa_diferente" {
	if (!idempresaPdv) return "pdv_sem_empresa";
	if (idempresaInformada && idempresaInformada !== idempresaPdv) {
		return "empresa_diferente";
	}
	return "ok";
}
