import { arredondarDinheiro } from "../../db/pagamento";
import type {
	CampoSitefColetado,
	LancamentoSitef,
	SitefPagarResultado,
} from "./tipos";

/** Função genérica: crédito/débito escolhido na PIN pad. */
export const FUNCAO_PAGAMENTO = 0;
/** Cancelamento da transação. */
export const FUNCAO_CANCELAMENTO = 200;

/** ContinuaFuncaoSiTefInterativo pede mais um passo. */
export const RET_CONTINUA = 10000;
export const RET_OK = 0;

/**
 * TipoCampo da CliSiTef usados no comprovante / registro local.
 * @see documentação Software Express — campos de retorno da transação
 */
export const TIPO_CAMPO = {
	nsuSitef: 121,
	nsuHost: 122,
	autorizacao: 131,
	autorizacaoAlt: 132,
	instituicao: 133,
	codigoBandeira: 134,
	nomeBandeira: 156,
	nsuAlt: 2021,
} as const;

const TIPOS_NSU = new Set<number>([
	TIPO_CAMPO.nsuSitef,
	TIPO_CAMPO.nsuHost,
	TIPO_CAMPO.nsuAlt,
]);

const TIPOS_AUTORIZACAO = new Set<number>([
	TIPO_CAMPO.autorizacao,
	TIPO_CAMPO.autorizacaoAlt,
]);

const TIPOS_BANDEIRA = new Set<number>([
	TIPO_CAMPO.nomeBandeira,
	TIPO_CAMPO.instituicao,
	TIPO_CAMPO.codigoBandeira,
]);

export const MENSAGENS_RETORNO: Record<number, string> = {
	0: "Transação aprovada",
	[-1]: "Módulo SiTef não inicializado",
	[-2]: "Operação cancelada no PIN pad",
	[-3]: "Transação negada",
	[-5]: "Sem comunicação com o SiTef",
	[-6]: "Transação cancelada pelo operador",
	[-8]: "DLL CliSiTef não encontrada ou incompatível",
	[-12]: "Erro na execução da função",
	[-15]: "Terminal ou loja inválidos",
	[-20]: "Parâmetros inválidos",
	[-40]: "Transação negada pelo autorizador",
};

export function mensagemRetornoSitef(codigo: number): string {
	if (codigo === RET_CONTINUA) {
		return "Aguardando PIN pad";
	}
	return MENSAGENS_RETORNO[codigo] ?? `SiTef retornou código ${codigo}`;
}

export function valorParaSitef(valor: number): string {
	const centavos = Math.round(arredondarDinheiro(valor) * 100);
	if (centavos <= 0) {
		throw new Error("Valor da transação SiTef inválido");
	}
	return String(centavos);
}

export function dataHoraFiscal(agora: Date): { data: string; hora: string } {
	const pad = (n: number, tam = 2) => String(n).padStart(tam, "0");
	return {
		data: `${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}`,
		hora: `${pad(agora.getHours())}${pad(agora.getMinutes())}${pad(agora.getSeconds())}`,
	};
}

export function cupomFiscalPadrao(agora: Date): string {
	return `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}${String(agora.getDate()).padStart(2, "0")}${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}${String(agora.getSeconds()).padStart(2, "0")}`;
}

function textoCampo(valor: string): string | null {
	const texto = valor.replace(/\0/g, "").trim();
	return texto.length ? texto : null;
}

export function extrairCamposSitef(campos: CampoSitefColetado[]): {
	nsu: string | null;
	autorizacao: string | null;
	bandeira: string | null;
} {
	let nsu: string | null = null;
	let nsuHost: string | null = null;
	let autorizacao: string | null = null;
	let bandeira: string | null = null;
	let instituicao: string | null = null;
	let codigoBandeira: string | null = null;

	for (const campo of campos) {
		const valor = textoCampo(campo.valor);
		if (!valor) continue;
		if (campo.tipoCampo === TIPO_CAMPO.nsuSitef) {
			nsu = valor;
		} else if (
			campo.tipoCampo === TIPO_CAMPO.nsuHost ||
			campo.tipoCampo === TIPO_CAMPO.nsuAlt
		) {
			nsuHost = nsuHost ?? valor;
		} else if (TIPOS_AUTORIZACAO.has(campo.tipoCampo)) {
			autorizacao = autorizacao ?? valor;
		} else if (campo.tipoCampo === TIPO_CAMPO.nomeBandeira) {
			bandeira = valor;
		} else if (campo.tipoCampo === TIPO_CAMPO.instituicao) {
			instituicao = instituicao ?? valor;
		} else if (campo.tipoCampo === TIPO_CAMPO.codigoBandeira) {
			codigoBandeira = codigoBandeira ?? valor;
		}
	}

	return {
		nsu: nsu ?? nsuHost,
		autorizacao,
		bandeira: bandeira ?? instituicao ?? codigoBandeira,
	};
}

export function ehCampoRetornoUtil(tipoCampo: number): boolean {
	return (
		TIPOS_NSU.has(tipoCampo) ||
		TIPOS_AUTORIZACAO.has(tipoCampo) ||
		TIPOS_BANDEIRA.has(tipoCampo)
	);
}

export function resultadoParaLancamento(
	valor: number,
	resultado: Pick<SitefPagarResultado, "nsu" | "autorizacao" | "bandeira">,
): LancamentoSitef {
	return {
		meio: "CARTAO",
		valor: arredondarDinheiro(valor),
		status: "ok",
		nsu: resultado.nsu ?? null,
		autorizacao: resultado.autorizacao ?? null,
		bandeira: resultado.bandeira ?? null,
	};
}
