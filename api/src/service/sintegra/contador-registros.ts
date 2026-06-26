export class ContadorRegistrosSintegra {
	private contadores = new Map<string, number>();

	incrementar(tipo: string, quantidade = 1): void {
		const atual = this.contadores.get(tipo) ?? 0;
		this.contadores.set(tipo, atual + quantidade);
	}

	obter(tipo: string): number {
		return this.contadores.get(tipo) ?? 0;
	}

	obterTodos(): Map<string, number> {
		return new Map(this.contadores);
	}

	totalGeral(incluirCabecalho = true): number {
		let total = 0;
		for (const [tipo, quantidade] of this.contadores) {
			if (!incluirCabecalho && (tipo === "10" || tipo === "11")) continue;
			total += quantidade;
		}
		return total;
	}
}
