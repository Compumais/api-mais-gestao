import { ESTADOS_BRASIL } from "@/constants/estados-brasil.js";

export type ChaveNfeDecodificada = {
	chave: string;
	codigoUf: string;
	siglaUf: string | null;
	anoMes: string;
	cnpjEmitente: string;
	modelo: string;
	serie: string;
	numero: string;
	tipoEmissao: string;
	codigoNumerico: string;
	digitoVerificador: string;
	digitoVerificadorValido: boolean;
};

export function calcularDigitoVerificadorChaveNfe(chave43: string): number {
	if (!/^\d{43}$/.test(chave43)) {
		throw new Error("Chave deve conter 43 dígitos para cálculo do DV");
	}

	const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
	let soma = 0;

	for (let indice = chave43.length - 1, pesoIndice = 0; indice >= 0; indice--) {
		const digito = chave43.charAt(indice);
		const peso = pesos[pesoIndice % pesos.length] ?? 2;
		soma += Number(digito) * peso;
		pesoIndice++;
	}

	const resto = soma % 11;
	const dv = 11 - resto;
	return dv >= 10 ? 0 : dv;
}

export function decodificarChaveNfe(chave: string): ChaveNfeDecodificada | null {
	if (!/^\d{44}$/.test(chave)) {
		return null;
	}

	const codigoUf = chave.slice(0, 2);
	const estado = ESTADOS_BRASIL.find((item) => item.codigoIbge === codigoUf);
	const chave43 = chave.slice(0, 43);
	const digitoInformado = chave.slice(43);
	const digitoCalculado = calcularDigitoVerificadorChaveNfe(chave43);

	return {
		chave,
		codigoUf,
		siglaUf: estado?.idestado ?? null,
		anoMes: chave.slice(2, 6),
		cnpjEmitente: chave.slice(6, 20),
		modelo: chave.slice(20, 22),
		serie: chave.slice(22, 25),
		numero: chave.slice(25, 34),
		tipoEmissao: chave.slice(34, 35),
		codigoNumerico: chave.slice(35, 43),
		digitoVerificador: digitoInformado,
		digitoVerificadorValido: digitoInformado === String(digitoCalculado),
	};
}

export type ResultadoValidacaoEstruturaChaveNfe =
	| { ok: true; decodificada: ChaveNfeDecodificada }
	| { ok: false; mensagem: string };

export function validarEstruturaChaveNfe(chave: string): ResultadoValidacaoEstruturaChaveNfe {
	const decodificada = decodificarChaveNfe(chave);

	if (!decodificada) {
		return {
			ok: false,
			mensagem: "Chave NF-e com formato inválido (esperado 44 dígitos numéricos)",
		};
	}

	if (!decodificada.digitoVerificadorValido) {
		return {
			ok: false,
			mensagem:
				"Dígito verificador da chave NF-e é inválido. Confira se copiou os 44 dígitos corretamente (use protNFe/infProt/chNFe no XML).",
		};
	}

	if (decodificada.modelo !== "55") {
		return {
			ok: false,
			mensagem: `A chave informada é do modelo ${decodificada.modelo}. A importação por chave suporta apenas NF-e modelo 55.`,
		};
	}

	return { ok: true, decodificada };
}
