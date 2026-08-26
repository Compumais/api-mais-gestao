export class ContadorRegistrosEfd {
	private contadores = new Map<string, number>();

	incrementar(tipo: string, quantidade = 1): void {
		this.contadores.set(tipo, (this.contadores.get(tipo) ?? 0) + quantidade);
	}

	obter(tipo: string): number {
		return this.contadores.get(tipo) ?? 0;
	}

	obterTodos(): Map<string, number> {
		return new Map(this.contadores);
	}

	quantidadeLinhasBloco(prefixo: string): number {
		let total = 0;
		for (const [tipo, quantidade] of this.contadores) {
			if (
				tipo.startsWith(prefixo) ||
				tipo === `${prefixo}001` ||
				tipo === `${prefixo}990`
			) {
				total += quantidade;
			}
		}
		return total;
	}

	totalGeral(): number {
		let total = 0;
		for (const quantidade of this.contadores.values()) {
			total += quantidade;
		}
		return total;
	}
}
