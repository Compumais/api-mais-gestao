import type { LancamentoPagamento } from "../../db/pagamento";

export type SitefConfig = {
	habilitado: boolean;
	ip: string;
	loja: string;
	terminal: string;
	parametros: string;
	portaPinPad: string;
	dllPath: string;
};

export type SitefStatus = {
	habilitado: boolean;
	disponivel: boolean;
	plataforma: NodeJS.Platform;
	dllEncontrada: boolean;
	dllPath: string | null;
	portaPinPad: string | null;
	mensagem: string;
};

export type SitefPagarParams = {
	valor: number;
	cupom?: string;
	operador?: string;
};

export type SitefPagarResultado = {
	ok: boolean;
	manual: boolean;
	nsu?: string | null;
	autorizacao?: string | null;
	bandeira?: string | null;
	mensagem?: string;
};

export type SitefCancelarParams = {
	nsu?: string | null;
	valor?: number;
	cupom?: string;
	operador?: string;
};

export type SitefCancelarResultado = {
	ok: boolean;
	manual: boolean;
	mensagem?: string;
};

export type CampoSitefColetado = {
	tipoCampo: number;
	valor: string;
};

export type ContinuaEstado = {
	comando: number;
	tipoCampo: number;
	tamMinimo: number;
	tamMaximo: number;
	buffer: string;
};

export type ContinuaResultado = {
	ret: number;
	estado: ContinuaEstado;
};

/** Contrato da CliSiTef — implementação real só no main, via FFI. */
export type CliSiTefDll = {
	configura(
		ip: string,
		loja: string,
		terminal: string,
		reservado: string,
		parametros?: string,
	): number;
	iniciaFuncao(
		funcao: number,
		valor: string,
		cupom: string,
		data: string,
		hora: string,
		operador: string,
		restricoes: string,
	): number;
	continuaFuncao(estado: ContinuaEstado, continua: number): ContinuaResultado;
	finalizaFuncao(
		confirma: number,
		cupom: string,
		data: string,
		hora: string,
		parametros: string,
	): number;
};

export type SitefDeps = {
	dll?: CliSiTefDll | null;
	config?: SitefConfig;
	agora?: () => Date;
};

export type LancamentoSitef = Pick<
	LancamentoPagamento,
	"meio" | "valor" | "nsu" | "autorizacao" | "bandeira" | "status"
>;
