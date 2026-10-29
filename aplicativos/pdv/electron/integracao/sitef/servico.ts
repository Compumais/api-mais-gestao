import { getConfig } from "../../db/database";
import { carregarDll, resolverCaminhoDll } from "./dll";
import {
	cupomFiscalPadrao,
	dataHoraFiscal,
	ehCampoRetornoUtil,
	extrairCamposSitef,
	FUNCAO_CANCELAMENTO,
	FUNCAO_PAGAMENTO,
	mensagemRetornoSitef,
	RET_CONTINUA,
	RET_OK,
	valorParaSitef,
} from "./mapeamento";
import type {
	CampoSitefColetado,
	CliSiTefDll,
	ContinuaEstado,
	SitefCancelarParams,
	SitefCancelarResultado,
	SitefConfig,
	SitefDeps,
	SitefPagarParams,
	SitefPagarResultado,
	SitefStatus,
} from "./tipos";

const MAX_PASSOS = 200;

let chaveConfigurada: string | null = null;

export function configSitefPadrao(): SitefConfig {
	return {
		habilitado: false,
		ip: "127.0.0.1",
		loja: "00000000",
		terminal: "PD000001",
		parametros: "",
		portaPinPad: "",
		dllPath: "",
	};
}

/** Normaliza COM5 / com5 / PortaPinPad=COM5 → COM5. Vazio se não informado. */
export function normalizarPortaPinPad(valor: string): string {
	let porta = valor.trim();
	if (!porta) {
		return "";
	}
	porta = porta.replace(/^PortaPinPad=/i, "").trim();
	if (/^com\d+$/i.test(porta)) {
		return porta.toUpperCase();
	}
	return porta;
}

/**
 * Monta o parâmetro CliSiTef: PortaPinPad=COMx combinado com extras.
 * Porta vazia mantém só os extras (ini / sitef_parametros).
 */
export function montarParametrosSitef(
	portaPinPad: string,
	extras: string,
): string {
	const extrasTrim = extras.trim();
	const porta = normalizarPortaPinPad(portaPinPad);
	if (!porta) {
		return extrasTrim;
	}
	const pinPad = `PortaPinPad=${porta}`;
	if (!extrasTrim) {
		return pinPad;
	}
	const extrasSemPorta = extrasTrim
		.replace(/;?PortaPinPad=[^;]*/gi, "")
		.replace(/^;+|;+$/g, "")
		.trim();
	return extrasSemPorta ? `${pinPad};${extrasSemPorta}` : pinPad;
}

export function parametrosEfetivosSitef(config: SitefConfig): string {
	return montarParametrosSitef(config.portaPinPad, config.parametros);
}

export async function lerConfigSitef(): Promise<SitefConfig> {
	return {
		habilitado: (await getConfig("sitef_habilitado", "0")) === "1",
		ip: (await getConfig("sitef_ip", "127.0.0.1")).trim() || "127.0.0.1",
		loja: (await getConfig("sitef_loja", "00000000")).trim() || "00000000",
		terminal:
			(await getConfig("sitef_terminal", "PD000001")).trim() || "PD000001",
		parametros: (await getConfig("sitef_parametros", "")).trim(),
		portaPinPad: (await getConfig("sitef_porta_pinpad", "")).trim(),
		dllPath: (await getConfig("sitef_dll_path", "")).trim(),
	};
}

export function statusSitefCom(
	config: SitefConfig,
	dll: CliSiTefDll | null,
	dllPath: string | null,
): SitefStatus {
	const plataforma = process.platform;
	const dllEncontrada = Boolean(dllPath);
	const portaPinPad = normalizarPortaPinPad(config.portaPinPad) || null;
	if (!config.habilitado) {
		return {
			habilitado: false,
			disponivel: false,
			plataforma,
			dllEncontrada,
			dllPath,
			portaPinPad,
			mensagem: "SiTef desligado — cartão será lançado manualmente",
		};
	}
	if (!dll) {
		const mensagem =
			plataforma !== "win32"
				? "SiTef só opera no Windows com a DLL CliSiTef. Cartão segue manual."
				: dllEncontrada
					? "DLL encontrada, mas o FFI (koffi) não carregou. Cartão manual."
					: "DLL CliSiTef não encontrada. Cartão será lançado manualmente.";
		return {
			habilitado: true,
			disponivel: false,
			plataforma,
			dllEncontrada,
			dllPath,
			portaPinPad,
			mensagem,
		};
	}
	if (!config.ip || !config.loja || !config.terminal) {
		return {
			habilitado: true,
			disponivel: false,
			plataforma,
			dllEncontrada,
			dllPath,
			portaPinPad,
			mensagem: "Informe IP, loja e terminal SiTef nas configurações.",
		};
	}
	return {
		habilitado: true,
		disponivel: true,
		plataforma,
		dllEncontrada: true,
		dllPath,
		portaPinPad,
		mensagem: "SiTef pronto",
	};
}

export async function statusSitef(): Promise<SitefStatus> {
	const config = await lerConfigSitef();
	const caminho = resolverCaminhoDll(config.dllPath);
	const carregada = config.habilitado ? carregarDll(config.dllPath) : null;
	return statusSitefCom(
		config,
		carregada?.api ?? null,
		carregada?.path ?? caminho,
	);
}

function garantirConfigurado(dll: CliSiTefDll, config: SitefConfig): number {
	const parametros = parametrosEfetivosSitef(config);
	const chave = `${config.ip}|${config.loja}|${config.terminal}|${parametros}`;
	if (chaveConfigurada === chave) {
		return RET_OK;
	}
	const ret = dll.configura(
		config.ip,
		config.loja,
		config.terminal,
		"0",
		parametros,
	);
	if (ret === RET_OK) {
		chaveConfigurada = chave;
	}
	return ret;
}

function estadoInicial(): ContinuaEstado {
	return {
		comando: 0,
		tipoCampo: 0,
		tamMinimo: 0,
		tamMaximo: 0,
		buffer: "",
	};
}

/**
 * Loop interativo CliSiTef: inicia → continua (até ret != 10000) → finaliza.
 * Comandos de tela/menu são auto-confirmados; campos de retorno são coletados.
 */
export function executarFuncaoInterativa(
	dll: CliSiTefDll,
	params: {
		funcao: number;
		valor: string;
		cupom: string;
		data: string;
		hora: string;
		operador: string;
		restricoes: string;
	},
): { ret: number; campos: CampoSitefColetado[] } {
	const campos: CampoSitefColetado[] = [];
	let ret = dll.iniciaFuncao(
		params.funcao,
		params.valor,
		params.cupom,
		params.data,
		params.hora,
		params.operador,
		params.restricoes,
	);
	let estado = estadoInicial();
	let passos = 0;

	while (ret === RET_CONTINUA) {
		passos += 1;
		if (passos > MAX_PASSOS) {
			dll.finalizaFuncao(0, params.cupom, params.data, params.hora, "");
			return { ret: -12, campos };
		}
		const passo = dll.continuaFuncao(estado, 0);
		ret = passo.ret;
		estado = passo.estado;
		if (ehCampoRetornoUtil(estado.tipoCampo) && estado.buffer.trim()) {
			campos.push({
				tipoCampo: estado.tipoCampo,
				valor: estado.buffer,
			});
		}
	}

	const confirma = ret === RET_OK ? 1 : 0;
	const fin = dll.finalizaFuncao(
		confirma,
		params.cupom,
		params.data,
		params.hora,
		"",
	);
	if (ret === RET_OK && fin !== RET_OK) {
		return { ret: fin, campos };
	}
	return { ret, campos };
}

export function pagarComSitef(
	params: SitefPagarParams,
	deps: SitefDeps = {},
): SitefPagarResultado {
	const config = deps.config ?? configSitefPadrao();
	const dll = deps.dll ?? null;
	const status = statusSitefCom(
		config,
		dll,
		dll ? config.dllPath || "injetada" : null,
	);
	if (!status.disponivel || !dll) {
		return {
			ok: false,
			manual: true,
			mensagem: status.mensagem,
		};
	}
	if (!(params.valor > 0)) {
		return {
			ok: false,
			manual: false,
			mensagem: "Valor inválido para o SiTef",
		};
	}

	const cfgRet = garantirConfigurado(dll, config);
	if (cfgRet !== RET_OK) {
		return {
			ok: false,
			manual: false,
			mensagem: mensagemRetornoSitef(cfgRet),
		};
	}

	const agora = deps.agora?.() ?? new Date();
	const { data, hora } = dataHoraFiscal(agora);
	const cupom = params.cupom?.trim() || cupomFiscalPadrao(agora);
	const { ret, campos } = executarFuncaoInterativa(dll, {
		funcao: FUNCAO_PAGAMENTO,
		valor: valorParaSitef(params.valor),
		cupom,
		data,
		hora,
		operador: params.operador?.trim() || "PDV",
		restricoes: parametrosEfetivosSitef(config),
	});

	if (ret !== RET_OK) {
		return {
			ok: false,
			manual: false,
			mensagem: mensagemRetornoSitef(ret),
		};
	}

	const extraidos = extrairCamposSitef(campos);
	return {
		ok: true,
		manual: false,
		...extraidos,
		mensagem: mensagemRetornoSitef(RET_OK),
	};
}

export function cancelarComSitef(
	params: SitefCancelarParams,
	deps: SitefDeps = {},
): SitefCancelarResultado {
	const config = deps.config ?? configSitefPadrao();
	const dll = deps.dll ?? null;
	const status = statusSitefCom(
		config,
		dll,
		dll ? config.dllPath || "injetada" : null,
	);
	if (!status.disponivel || !dll) {
		return {
			ok: true,
			manual: true,
			mensagem: status.mensagem,
		};
	}

	const cfgRet = garantirConfigurado(dll, config);
	if (cfgRet !== RET_OK) {
		return { ok: false, manual: false, mensagem: mensagemRetornoSitef(cfgRet) };
	}

	const agora = deps.agora?.() ?? new Date();
	const { data, hora } = dataHoraFiscal(agora);
	const cupom = params.cupom?.trim() || cupomFiscalPadrao(agora);
	const valor =
		params.valor && params.valor > 0 ? valorParaSitef(params.valor) : "0";
	const restricoes = [
		parametrosEfetivosSitef(config),
		params.nsu ? `{NSU=${params.nsu}}` : "",
	]
		.filter(Boolean)
		.join(";");

	const { ret } = executarFuncaoInterativa(dll, {
		funcao: FUNCAO_CANCELAMENTO,
		valor,
		cupom,
		data,
		hora,
		operador: params.operador?.trim() || "PDV",
		restricoes,
	});

	if (ret !== RET_OK) {
		return { ok: false, manual: false, mensagem: mensagemRetornoSitef(ret) };
	}
	return { ok: true, manual: false, mensagem: "Cancelamento SiTef ok" };
}

export function resetarConfiguracaoSitef(): void {
	chaveConfigurada = null;
}

export async function sitefPagar(
	params: SitefPagarParams,
): Promise<SitefPagarResultado> {
	const config = await lerConfigSitef();
	const carregada = config.habilitado ? carregarDll(config.dllPath) : null;
	return pagarComSitef(params, { config, dll: carregada?.api ?? null });
}

export async function sitefCancelar(
	params: SitefCancelarParams,
): Promise<SitefCancelarResultado> {
	const config = await lerConfigSitef();
	const carregada = config.habilitado ? carregarDll(config.dllPath) : null;
	return cancelarComSitef(params, { config, dll: carregada?.api ?? null });
}
