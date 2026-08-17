import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extrairConfigNegocio,
	identidadePdvMudou,
	mesclarConfigNegocio,
	montarUrlPrincipal,
	normalizarModoPdv,
	parseNumeroPdv,
	validarNumeroPdv,
} from "./regras";

describe("montarUrlPrincipal", () => {
	it("monta http://host:porta", () => {
		assert.equal(
			montarUrlPrincipal("192.168.1.10", "5050"),
			"http://192.168.1.10:5050",
		);
	});

	it("remove esquema, path e porta embutida", () => {
		assert.equal(
			montarUrlPrincipal("http://192.168.1.10:9999/pos", 5050),
			"http://192.168.1.10:5050",
		);
	});

	it("usa 5050 quando a porta é inválida", () => {
		assert.equal(
			montarUrlPrincipal("pdv-salao", "abc"),
			"http://pdv-salao:5050",
		);
	});

	it("recusa host vazio", () => {
		assert.throws(() => montarUrlPrincipal("  "), /Informe o IP/);
	});
});

describe("validarNumeroPdv", () => {
	it("aceita número livre diferente do principal", () => {
		const r = validarNumeroPdv({
			proposto: "3",
			numeroPrincipal: 1,
			ocupados: [2],
		});
		assert.deepEqual(r, { ok: true, numero: 3 });
	});

	it("recusa o mesmo número do principal", () => {
		const r = validarNumeroPdv({ proposto: 1, numeroPrincipal: 1 });
		assert.equal(r.ok, false);
		if (!r.ok) {
			assert.equal(r.codigo, "mesmo_principal");
		}
	});

	it("recusa número já ocupado por outro secundário", () => {
		const r = validarNumeroPdv({
			proposto: "2",
			numeroPrincipal: 1,
			ocupados: [2, 4],
		});
		assert.equal(r.ok, false);
		if (!r.ok) {
			assert.equal(r.codigo, "duplicado");
		}
	});

	it("recusa zero, decimal e vazio", () => {
		assert.equal(
			validarNumeroPdv({ proposto: "0", numeroPrincipal: 1 }).ok,
			false,
		);
		assert.equal(
			validarNumeroPdv({ proposto: "1.5", numeroPrincipal: 1 }).ok,
			false,
		);
		assert.equal(
			validarNumeroPdv({ proposto: "", numeroPrincipal: 1 }).ok,
			false,
		);
	});
});

describe("mesclarConfigNegocio", () => {
	it("copia só chaves de negócio e preserva SiTef/impressora/número", () => {
		const local = {
			numeropdv: "2",
			pdv_modo: "secundario",
			sitef_ip: "10.0.0.8",
			sitef_porta_pinpad: "COM5",
			impressora_host: "192.168.1.50",
			balanca_porta: "COM7",
			qtd_mesas: "10",
			pix_chave: "antiga",
			tema: "dark",
		};
		const remota = {
			numeropdv: "1",
			sitef_ip: "127.0.0.1",
			sitef_porta_pinpad: "COM1",
			impressora_host: "10.0.0.1",
			balanca_porta: "COM1",
			qtd_mesas: "20",
			modelo_atendimento: "comanda",
			pix_chave: "nova-chave",
			api_url: "https://api.compuchat.space",
			tema: "light",
			lan_porta: "5050",
		};
		const m = mesclarConfigNegocio(local, remota);
		assert.equal(m.numeropdv, "2");
		assert.equal(m.sitef_ip, "10.0.0.8");
		assert.equal(m.sitef_porta_pinpad, "COM5");
		assert.equal(m.impressora_host, "192.168.1.50");
		assert.equal(m.balanca_porta, "COM7");
		assert.equal(m.tema, "dark");
		assert.equal(m.qtd_mesas, "20");
		assert.equal(m.modelo_atendimento, "comanda");
		assert.equal(m.pix_chave, "nova-chave");
		assert.equal(m.api_url, "https://api.compuchat.space");
		assert.equal(m.lan_porta, undefined);
	});
});

describe("helpers", () => {
	it("normaliza modo e número", () => {
		assert.equal(normalizarModoPdv("secundario"), "secundario");
		assert.equal(normalizarModoPdv("outro"), "principal");
		assert.equal(parseNumeroPdv("7"), 7);
		assert.equal(parseNumeroPdv("x"), 0);
	});

	it("extrai só chaves de negócio", () => {
		const extra = extrairConfigNegocio({
			qtd_mesas: "20",
			sitef_ip: "1.1.1.1",
			pix_chave: "abc",
		});
		assert.deepEqual(extra, { qtd_mesas: "20", pix_chave: "abc" });
	});

	it("detecta mudança de identidade", () => {
		assert.equal(
			identidadePdvMudou({ numeropdv: "1" }, { numeropdv: "2" }),
			true,
		);
		assert.equal(
			identidadePdvMudou({ numeropdv: "1" }, { numeropdv: "1", sitef_ip: "x" }),
			false,
		);
	});
});
