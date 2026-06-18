const SOMENTE_DIGITOS = /\D/g;

export function somenteDigitos(valor: string): string {
	return valor.replace(SOMENTE_DIGITOS, "");
}

export function validarCpf(cpf: string): boolean {
	const numeros = somenteDigitos(cpf);
	if (numeros.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(numeros)) return false;

	const calcularDigito = (base: string, fator: number) => {
		let total = 0;
		for (let i = 0; i < base.length; i++) {
			total += Number(base[i]) * (fator - i);
		}
		const resto = (total * 10) % 11;
		return resto === 10 ? 0 : resto;
	};

	const digito1 = calcularDigito(numeros.slice(0, 9), 10);
	const digito2 = calcularDigito(numeros.slice(0, 10), 11);
	return digito1 === Number(numeros[9]) && digito2 === Number(numeros[10]);
}

export function validarCnpj(cnpj: string): boolean {
	const numeros = somenteDigitos(cnpj);
	if (numeros.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(numeros)) return false;

	const calcularDigito = (base: string) => {
		const pesos =
			base.length === 12
				? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
				: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const total = base
			.split("")
			.reduce((acc, digito, index) => acc + Number(digito) * pesos[index]!, 0);
		const resto = total % 11;
		return resto < 2 ? 0 : 11 - resto;
	};

	const digito1 = calcularDigito(numeros.slice(0, 12));
	const digito2 = calcularDigito(numeros.slice(0, 13));
	return digito1 === Number(numeros[12]) && digito2 === Number(numeros[13]);
}

export function validarCpfCnpj(documento: string): boolean {
	const numeros = somenteDigitos(documento);
	if (numeros.length === 11) return validarCpf(documento);
	if (numeros.length === 14) return validarCnpj(documento);
	return false;
}

function modulo11(ie: string, pesos: number[], posicoes: number[]): boolean {
	const base = ie.slice(0, -posicoes.length);
	let soma = 0;
	for (let i = 0; i < pesos.length; i++) {
		soma += Number(base[i]) * pesos[i]!;
	}
	let resto = soma % 11;
	const digito = resto < 2 ? 0 : 11 - resto;
	return digito === Number(ie[posicoes[0]!]);
}

const validadoresIePorUf: Record<string, (ie: string) => boolean> = {
	AC: (ie) => modulo11(ie, [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [10]),
	AL: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	AP: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	AM: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	BA: (ie) => {
		if (ie.length === 8) {
			const base = ie.slice(0, 6);
			const pesos = [7, 6, 5, 4, 3, 2];
			let soma = pesos.reduce(
				(acc, peso, i) => acc + Number(base[i]) * peso,
				0,
			);
			let resto = soma % 10;
			const d1 = resto === 0 ? 0 : 10 - resto;
			if (d1 !== Number(ie[6])) return false;
			soma = [...base, String(d1)]
				.map(Number)
				.reduce((acc, n, i) => acc + n * [8, 7, 6, 5, 4, 3, 2, 1][i]!, 0);
			resto = soma % 10;
			const d2 = resto === 0 ? 0 : 10 - resto;
			return d2 === Number(ie[7]);
		}
		return ie.length === 9 && modulo11(ie, [8, 7, 6, 5, 4, 3, 2, 1], [8]);
	},
	CE: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	DF: (ie) => modulo11(ie, [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [10]),
	ES: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	GO: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	MA: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	MT: (ie) => modulo11(ie, [3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [10]),
	MS: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	MG: (ie) => {
		if (ie.length !== 13) return false;
		const base = ie.slice(0, 3) + "0" + ie.slice(3, 11);
		let soma = 0;
		for (let i = 0; i < 12; i++) {
			soma += Number(base[i]) * Number(base[i + 1]);
		}
		const dezena = String(soma).slice(-2);
		const d1 = 10 - Number(dezena[1]);
		const digito1 = d1 >= 10 ? 0 : d1;
		if (digito1 !== Number(ie[11])) return false;
		return modulo11(
			ie.slice(0, 11) + String(digito1),
			[3, 2, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
			[12],
		);
	},
	PA: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	PB: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	PR: (ie) => {
		if (ie.length !== 10) return false;
		const d1ok = modulo11(ie, [3, 2, 7, 6, 5, 4, 3, 2], [8]);
		const d2ok = modulo11(ie, [4, 3, 2, 7, 6, 5, 4, 3, 2], [9]);
		return d1ok && d2ok;
	},
	PE: (ie) => {
		if (ie.length === 9) {
			return modulo11(ie, [8, 7, 6, 5, 4, 3, 2, 1], [8]);
		}
		return ie.length === 14;
	},
	PI: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	RJ: (ie) => {
		if (ie.length !== 8) return false;
		const base = ie.slice(0, 7);
		let soma = 0;
		for (let i = 0; i < 7; i++) {
			soma += Number(base[i]) * (2 + ((i + 1) % 7));
		}
		const resto = soma % 11;
		const digito = resto <= 1 ? 0 : 11 - resto;
		return digito === Number(ie[7]);
	},
	RN: (ie) => {
		if (ie.startsWith("20") && ie.length === 9) {
			return modulo11(ie, [10, 9, 8, 7, 6, 5, 4, 3, 2], [8]);
		}
		return ie.length === 9 && modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]);
	},
	RS: (ie) => modulo11(ie, [2, 9, 8, 7, 6, 5, 4, 3, 2], [9]),
	RO: (ie) => {
		if (ie.length === 14) return true;
		return modulo11(ie, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [12]);
	},
	RR: (ie) => {
		if (ie.length !== 9 || !ie.startsWith("24")) return false;
		let soma = 0;
		for (let i = 0; i < 8; i++) soma += Number(ie[i]) * (i + 1);
		return soma % 9 === Number(ie[8]);
	},
	SC: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	SP: (ie) => {
		if (ie.length === 12) {
			const base = ie.slice(0, 8);
			let soma = 0;
			for (let i = 0; i < 8; i++) {
				soma += Number(base[i]) * (i + 1);
			}
			const d1 = soma % 11;
			if (d1 % 10 !== Number(ie[8])) return false;
			soma = 0;
			for (let i = 0; i < 10; i++) {
				soma += Number(ie[i]) * (i + 3);
			}
			return (soma % 11) % 10 === Number(ie[10]);
		}
		return ie.length === 13;
	},
	SE: (ie) => modulo11(ie, [9, 8, 7, 6, 5, 4, 3, 2], [8]),
	TO: (ie) => {
		if (ie.length !== 9) return false;
		const base = ie[0] + ie.slice(2, 8);
		return modulo11(base + "0", [9, 8, 7, 6, 5, 4, 3, 2], [8]);
	},
};

export function validarInscricaoEstadual(
	ie: string | null | undefined,
	uf: string | null | undefined,
): boolean {
	if (!ie || ie.trim() === "") return true;
	const normalizada = ie.trim().toUpperCase();
	if (normalizada === "ISENTO" || normalizada === "ISENTA") return true;

	if (!uf) return false;
	const numeros = somenteDigitos(ie);
	if (!numeros) return false;

	const validador = validadoresIePorUf[uf.toUpperCase()];
	if (!validador) return numeros.length >= 8 && numeros.length <= 14;
	return validador(numeros);
}

export function validarTelefone(telefone: string | null | undefined): boolean {
	if (!telefone || telefone.trim() === "") return true;
	const numeros = somenteDigitos(telefone);
	return numeros.length >= 10 && numeros.length <= 11;
}
