import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { somarLancamentos } from "../../db/pagamento";
import {
	RET_CONTINUA,
	RET_OK,
	resultadoParaLancamento,
	TIPO_CAMPO,
} from "./mapeamento";
import {
	cancelarComSitef,
	configSitefPadrao,
	montarParametrosSitef,
	pagarComSitef,
	resetarConfiguracaoSitef,
	statusSitefCom,
} from "./servico";
import type { CliSiTefDll, ContinuaEstado, ContinuaResultado } from "./tipos";

function configHabilitada() {
	return { ...configSitefPadrao(), habilitado: true, ip: "10.0.0.8" };
}

function dllScript(
	passos: ContinuaResultado[],
	opts?: { configura?: number },
): CliSiTefDll {
	let i = 0;
	return {
		configura: () => opts?.configura ?? RET_OK,
		iniciaFuncao: () => RET_CONTINUA,
		continuaFuncao: (_estado: ContinuaEstado, _continua: number) => {
			const passo = passos[i] ?? { ret: -12, estado: _estado };
			i += 1;
			return passo;
		},
		finalizaFuncao: () => RET_OK,
	};
}

function passoCampo(
	tipoCampo: number,
	valor: string,
	ret = RET_CONTINUA,
): ContinuaResultado {
	return {
		ret,
		estado: {
			comando: 0,
			tipoCampo,
			tamMinimo: 0,
			tamMaximo: 0,
			buffer: valor,
		},
	};
}

describe("montarParametrosSitef", () => {
	it("porta só vira PortaPinPad=COMx", () => {
		assert.equal(montarParametrosSitef("COM5", ""), "PortaPinPad=COM5");
		assert.equal(montarParametrosSitef("com3", "  "), "PortaPinPad=COM3");
	});

	it("porta + extras combina sem sobrescrever os extras", () => {
		assert.equal(
			montarParametrosSitef("COM5", "[ParmsClient=1=ABC]"),
			"PortaPinPad=COM5;[ParmsClient=1=ABC]",
		);
		assert.equal(
			montarParametrosSitef("COM3", "Timeout=30"),
			"PortaPinPad=COM3;Timeout=30",
		);
	});

	it("porta vazia mantém só os extras (comportamento atual)", () => {
		assert.equal(montarParametrosSitef("", ""), "");
		assert.equal(
			montarParametrosSitef("  ", "[ParmsClient=1=ABC]"),
			"[ParmsClient=1=ABC]",
		);
		assert.equal(
			montarParametrosSitef("", "PortaPinPad=COM9"),
			"PortaPinPad=COM9",
		);
	});
});

describe("statusSitefCom", () => {
	it("desligado ou sem DLL cai em cartão manual", () => {
		const off = statusSitefCom(configSitefPadrao(), null, null);
		assert.equal(off.disponivel, false);
		assert.match(off.mensagem, /manual/i);

		const semDll = statusSitefCom(configHabilitada(), null, null);
		assert.equal(semDll.disponivel, false);
		assert.match(semDll.mensagem, /manual/i);
	});

	it("com DLL injetada fica disponível em qualquer SO", () => {
		const dll = dllScript([{ ret: RET_OK, estado: passoCampo(0, "").estado }]);
		const status = statusSitefCom(configHabilitada(), dll, "mock");
		assert.equal(status.disponivel, true);
	});
});

describe("pagarComSitef", () => {
	it("sem DLL devolve manual=true e não autoriza", () => {
		resetarConfiguracaoSitef();
		const r = pagarComSitef(
			{ valor: 50 },
			{ config: configHabilitada(), dll: null },
		);
		assert.equal(r.ok, false);
		assert.equal(r.manual, true);
	});

	it("coleta NSU/autorização/bandeira no loop interativo", () => {
		resetarConfiguracaoSitef();
		const dll = dllScript([
			passoCampo(TIPO_CAMPO.nsuSitef, "9001"),
			passoCampo(TIPO_CAMPO.autorizacao, "AUTH7"),
			passoCampo(TIPO_CAMPO.nomeBandeira, "ELO", RET_OK),
		]);
		const r = pagarComSitef(
			{ valor: 35.5 },
			{
				config: configHabilitada(),
				dll,
				agora: () => new Date(2026, 7, 16, 10, 0, 0),
			},
		);
		assert.equal(r.ok, true);
		assert.equal(r.manual, false);
		assert.equal(r.nsu, "9001");
		assert.equal(r.autorizacao, "AUTH7");
		assert.equal(r.bandeira, "ELO");
	});

	it("cancelamento no PIN pad não vira lançamento", () => {
		resetarConfiguracaoSitef();
		const dll = dllScript([
			{
				ret: -2,
				estado: {
					comando: 0,
					tipoCampo: 0,
					tamMinimo: 0,
					tamMaximo: 0,
					buffer: "Cancelado",
				},
			},
		]);
		const r = pagarComSitef({ valor: 10 }, { config: configHabilitada(), dll });
		assert.equal(r.ok, false);
		assert.equal(r.manual, false);
		assert.match(r.mensagem ?? "", /cancelada/i);
	});
});

describe("cancelarComSitef", () => {
	it("sem DLL confirma cancelamento local (manual)", () => {
		const r = cancelarComSitef(
			{ nsu: "1", valor: 10 },
			{ config: configHabilitada(), dll: null },
		);
		assert.equal(r.ok, true);
		assert.equal(r.manual, true);
	});

	it("com DLL percorre cancelamento interativo", () => {
		resetarConfiguracaoSitef();
		const dll = dllScript([
			{
				ret: RET_OK,
				estado: {
					comando: 0,
					tipoCampo: 0,
					tamMinimo: 0,
					tamMaximo: 0,
					buffer: "",
				},
			},
		]);
		const r = cancelarComSitef(
			{ nsu: "9001", valor: 35.5 },
			{ config: configHabilitada(), dll },
		);
		assert.equal(r.ok, true);
		assert.equal(r.manual, false);
	});
});

describe("soma de lançamentos SiTef + PIX", () => {
	it("dois retornos de cartão + PIX fecham 100", () => {
		const cartoes = [
			resultadoParaLancamento(40, {
				nsu: "A",
				autorizacao: "1",
				bandeira: "VISA",
			}),
			resultadoParaLancamento(30, {
				nsu: "B",
				autorizacao: "2",
				bandeira: "MASTER",
			}),
		];
		assert.equal(
			somarLancamentos([...cartoes, { meio: "PIX", valor: 30, status: "ok" }]),
			100,
		);
	});
});
