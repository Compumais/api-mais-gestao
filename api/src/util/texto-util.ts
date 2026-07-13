const LIMITE_INTEGER_POSTGRES = 2_147_483_647;
const LIMITE_SMALLINT_POSTGRES = 32_767;

export function inteiroValidoParaPostgres(
	valor?: number,
): number | undefined {
	if (valor === undefined || Number.isNaN(valor)) return undefined;
	if (!Number.isInteger(valor)) return undefined;
	if (valor < -2_147_483_648 || valor > LIMITE_INTEGER_POSTGRES) return undefined;
	return valor;
}

export function smallintValidoParaPostgres(
	valor?: number,
): number | undefined {
	if (valor === undefined || Number.isNaN(valor)) return undefined;
	const inteiro = Math.trunc(valor);
	if (inteiro < -32_768 || inteiro > LIMITE_SMALLINT_POSTGRES) return undefined;
	return inteiro;
}

/** @deprecated Use normalizarCodigoBarras para EAN/GTIN */
export function eanValidoParaBanco(ean?: number): number | undefined {
	return inteiroValidoParaPostgres(ean);
}

export function normalizarCodigoBarras(
	valor?: string | number | null,
): string | null {
	if (valor === undefined || valor === null) return null;

	const digitos = String(valor).replace(/\D/g, "");
	if (!digitos || digitos.length > 14) return null;

	return digitos;
}

export function truncarTexto(
	valor: string | null | undefined,
	tamanhoMaximo: number,
): string | null {
	if (valor === undefined || valor === null) return null;
	const texto = valor.trim();
	if (!texto) return null;
	return texto.length > tamanhoMaximo
		? texto.substring(0, tamanhoMaximo)
		: texto;
}

export function idOpcionalOuNulo(
	valor?: string | null,
): string | null | undefined {
	if (valor === undefined) return undefined;
	if (valor === null) return null;
	const texto = valor.trim();
	return texto.length > 0 ? texto : null;
}

export function numeroOpcionalOuNulo(
	valor?: string | null,
): string | null | undefined {
	if (valor === undefined) return undefined;
	if (valor === null) return null;
	const texto = valor.trim();
	return texto.length > 0 ? texto : null;
}

export function normalizarDataHoraTimestamp(
	valor?: string | null,
): string | null {
	if (!valor) return null;
	const texto = valor.trim();
	if (!texto) return null;

	const semFuso = texto.replace(/([+-]\d{2}:\d{2}|Z)$/i, "").substring(0, 19);

	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(semFuso)) {
		return semFuso;
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(texto.substring(0, 10))) {
		return `${texto.substring(0, 10)}T00:00:00`;
	}

	return null;
}

export function extrairMensagemErroBanco(erro: unknown): string {
	const mensagem = obterMensagemErroPostgres(erro);

	if (mensagem.includes("does not exist")) {
		return "Schema do banco desatualizado em relação à API. Na VPS, execute: cd api && pnpm run db:migrate:producao";
	}

	if (mensagem.includes("specified more than once")) {
		return "Erro no schema de itens da nota fiscal (coluna duplicada)";
	}

	if (mensagem.includes("integer out of range")) {
		return "Código EAN ou numérico excede o limite permitido no banco de dados. Execute a migration 0025_produtos_ean_varchar.sql";
	}

	if (mensagem.includes("value too long")) {
		return "Um ou mais campos excedem o tamanho permitido no banco de dados";
	}

	if (mensagem.includes("violates foreign key constraint")) {
		return "Referência inválida (plano de contas, condição de pagamento ou produto)";
	}

	if (mensagem.includes("duplicate key") || mensagem.includes("unique constraint")) {
		return "Nota fiscal já importada (chave NF-e duplicada)";
	}

	if (mensagem.includes("invalid input syntax for type timestamp")) {
		return "Data/hora de emissão inválida no XML";
	}

	if (mensagem.includes("invalid input syntax for type date")) {
		return "Data inválida";
	}

	return mensagem || "Erro ao salvar nota fiscal no banco de dados";
}

function obterMensagemErroPostgres(erro: unknown): string {
	if (erro instanceof Error) {
		const cause = (erro as Error & { cause?: unknown }).cause;
		if (cause instanceof Error) {
			return cause.message;
		}
		return erro.message;
	}

	return "";
}
