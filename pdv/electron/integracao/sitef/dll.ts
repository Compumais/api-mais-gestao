import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { CliSiTefDll, ContinuaEstado, ContinuaResultado } from "./tipos";

const NOMES_DLL = ["CliSiTef64I.dll", "CliSiTef32I.dll", "clisitef64I.dll"];

const PASTAS_PADRAO = [
	"C:\\SiTef",
	"C:\\CliSiTef",
	"C:\\Software Express\\CliSiTef",
];

type KoffiLib = {
	func: (sig: string) => (...args: unknown[]) => unknown;
};

type KoffiMod = {
	load: (path: string) => KoffiLib;
	alloc: (type: string, lengthOrValue?: number | string) => unknown;
	decode: (ptr: unknown, type: string) => unknown;
	as: (ptr: unknown, type: string) => unknown;
};

let dllCarregada: { path: string; api: CliSiTefDll } | null = null;

export function resolverCaminhoDll(preferido?: string): string | null {
	const candidatos: string[] = [];
	const extra = preferido?.trim();
	if (extra) {
		candidatos.push(extra);
		if (!extra.toLowerCase().endsWith(".dll")) {
			for (const nome of NOMES_DLL) {
				candidatos.push(join(extra, nome));
			}
		}
	}
	if (process.env.SITEF_DLL?.trim()) {
		candidatos.push(process.env.SITEF_DLL.trim());
	}
	candidatos.push(...NOMES_DLL.map((nome) => join(process.cwd(), nome)));
	const appDir = diretorioExecutavel();
	if (appDir) {
		candidatos.push(...NOMES_DLL.map((nome) => join(appDir, nome)));
	}
	for (const pasta of PASTAS_PADRAO) {
		candidatos.push(...NOMES_DLL.map((nome) => join(pasta, nome)));
	}
	for (const caminho of candidatos) {
		if (caminho && existsSync(caminho)) {
			return caminho;
		}
	}
	return null;
}

function diretorioExecutavel(): string | null {
	try {
		const require = createRequire(import.meta.url);
		const electron = require("electron") as {
			app?: { getPath: (name: string) => string };
		};
		const exe = electron.app?.getPath("exe");
		return exe ? dirname(exe) : null;
	} catch {
		return null;
	}
}

function importarKoffi(): KoffiMod | null {
	try {
		const require = createRequire(import.meta.url);
		const mod = require("koffi") as KoffiMod & { default?: KoffiMod };
		return mod.default ?? mod;
	} catch {
		return null;
	}
}

function lerCString(koffi: KoffiMod, buffer: unknown, max = 20000): string {
	try {
		const texto = koffi.decode(buffer, "char *");
		if (typeof texto === "string") {
			return texto.replace(/\0/g, "");
		}
	} catch {
		// fallback abaixo
	}
	try {
		const bytes = koffi.decode(buffer, `char[${max}]`);
		if (typeof bytes === "string") {
			return bytes.replace(/\0/g, "");
		}
		if (Array.isArray(bytes)) {
			const chars: number[] = [];
			for (const b of bytes) {
				const n = Number(b);
				if (!n) break;
				chars.push(n);
			}
			return String.fromCharCode(...chars);
		}
	} catch {
		return "";
	}
	return "";
}

function adaptarKoffi(koffi: KoffiMod, lib: KoffiLib): CliSiTefDll {
	const configura = lib.func(
		"int ConfiguraIntSiTefInterativo(str IPSiTef, str IdLoja, str IdTerminal, str Reservado)",
	);
	let configuraEx: ((...args: unknown[]) => unknown) | null = null;
	try {
		configuraEx = lib.func(
			"int ConfiguraIntSiTefInterativoEx(str IPSiTef, str IdLoja, str IdTerminal, str Reservado, str Parametros)",
		);
	} catch {
		configuraEx = null;
	}
	const inicia = lib.func(
		"int IniciaFuncaoSiTefInterativo(int Funcao, str Valor, str CupomFiscal, str DataFiscal, str HoraFiscal, str Operador, str Restricoes)",
	);
	const continua = lib.func(
		"int ContinuaFuncaoSiTefInterativo(_Inout_ int *Comando, _Inout_ long *TipoCampo, _Inout_ short *TamMinimo, _Inout_ short *TamMaximo, _Inout_ char *Buffer, int TamBuffer, int Continua)",
	);
	const finaliza = lib.func(
		"int FinalizaFuncaoSiTefInterativo(short Confirma, str CupomFiscal, str DataFiscal, str HoraFiscal, str Parametros)",
	);

	return {
		configura(ip, loja, terminal, reservado, parametros) {
			if (configuraEx && parametros?.trim()) {
				return Number(
					configuraEx(ip, loja, terminal, reservado, parametros) ?? -1,
				);
			}
			return Number(configura(ip, loja, terminal, reservado) ?? -1);
		},
		iniciaFuncao(funcao, valor, cupom, data, hora, operador, restricoes) {
			return Number(
				inicia(funcao, valor, cupom, data, hora, operador, restricoes) ?? -1,
			);
		},
		continuaFuncao(estado: ContinuaEstado, proximo: number): ContinuaResultado {
			const comando = koffi.alloc("int", estado.comando);
			const tipoCampo = koffi.alloc("long", estado.tipoCampo);
			const tamMinimo = koffi.alloc("short", estado.tamMinimo);
			const tamMaximo = koffi.alloc("short", estado.tamMaximo);
			const tamBuffer = 20000;
			const inicial = (estado.buffer ?? "").slice(0, tamBuffer - 1);
			const buffer = koffi.alloc("char", tamBuffer);
			if (inicial) {
				try {
					(
						koffi as KoffiMod & {
							encode?: (ptr: unknown, type: string, value: unknown) => void;
						}
					).encode?.(buffer, `char[${tamBuffer}]`, inicial);
				} catch {
					// buffer segue zerado; a CliSiTef preenche na volta
				}
			}
			const ret = Number(
				continua(
					comando,
					tipoCampo,
					tamMinimo,
					tamMaximo,
					buffer,
					tamBuffer,
					proximo,
				) ?? -1,
			);
			return {
				ret,
				estado: {
					comando: Number(koffi.decode(comando, "int") ?? 0),
					tipoCampo: Number(koffi.decode(tipoCampo, "long") ?? 0),
					tamMinimo: Number(koffi.decode(tamMinimo, "short") ?? 0),
					tamMaximo: Number(koffi.decode(tamMaximo, "short") ?? 0),
					buffer: lerCString(koffi, buffer, tamBuffer),
				},
			};
		},
		finalizaFuncao(confirma, cupom, data, hora, parametros) {
			return Number(finaliza(confirma, cupom, data, hora, parametros) ?? -1);
		},
	};
}

export function carregarDll(caminhoPreferido?: string): {
	api: CliSiTefDll;
	path: string;
} | null {
	if (process.platform !== "win32") {
		return null;
	}
	const caminho = resolverCaminhoDll(caminhoPreferido);
	if (!caminho) {
		return null;
	}
	if (dllCarregada?.path === caminho) {
		return dllCarregada;
	}
	const koffi = importarKoffi();
	if (!koffi) {
		return null;
	}
	try {
		const lib = koffi.load(caminho);
		const api = adaptarKoffi(koffi, lib);
		dllCarregada = { path: caminho, api };
		return dllCarregada;
	} catch {
		dllCarregada = null;
		return null;
	}
}

export function resetarDllCarregada(): void {
	dllCarregada = null;
}

export function dllEstaCarregada(): boolean {
	return dllCarregada !== null;
}
