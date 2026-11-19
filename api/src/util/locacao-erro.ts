export class ErroNegocioLocacao extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ErroNegocioLocacao";
	}
}

export function mensagemConflitoUnico(error: unknown): string | null {
	const visitados = new Set<unknown>();
	let atual: unknown = error;
	while (atual && typeof atual === "object" && !visitados.has(atual)) {
		visitados.add(atual);
		if ("code" in atual && atual.code === "23505") {
			return "Código já utilizado nesta empresa";
		}
		atual = "cause" in atual ? atual.cause : null;
	}
	return null;
}
