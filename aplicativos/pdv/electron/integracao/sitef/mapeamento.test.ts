import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { somarLancamentos } from "../../db/pagamento";
import {
	cupomFiscalPadrao,
	dataHoraFiscal,
	extrairCamposSitef,
	mensagemRetornoSitef,
	resultadoParaLancamento,
	TIPO_CAMPO,
	valorParaSitef,
} from "./mapeamento";

describe("valorParaSitef / dataHoraFiscal", () => {
	it("envia valor em centavos sem separador", () => {
		assert.equal(valorParaSitef(100), "10000");
		assert.equal(valorParaSitef(40.5), "4050");
		assert.equal(valorParaSitef(0.01), "1");
	});

	it("rejeita valor zero ou negativo", () => {
		assert.throws(() => valorParaSitef(0), /inválido/i);
		assert.throws(() => valorParaSitef(-10), /inválido/i);
	});

	it("formata data AAAAMMDD e hora HHMMSS", () => {
		const { data, hora } = dataHoraFiscal(new Date(2026, 7, 16, 21, 5, 9));
		assert.equal(data, "20260816");
		assert.equal(hora, "210509");
		assert.equal(
			cupomFiscalPadrao(new Date(2026, 7, 16, 21, 5, 9)),
			"20260816210509",
		);
	});
});

describe("extrairCamposSitef", () => {
	it("mapeia NSU, autorização e bandeira dos TipoCampo", () => {
		const extraidos = extrairCamposSitef([
			{ tipoCampo: TIPO_CAMPO.nsuSitef, valor: " 9000123 " },
			{ tipoCampo: TIPO_CAMPO.autorizacao, valor: "ABC999" },
			{ tipoCampo: TIPO_CAMPO.nomeBandeira, valor: "VISA\0" },
		]);
		assert.deepEqual(extraidos, {
			nsu: "9000123",
			autorizacao: "ABC999",
			bandeira: "VISA",
		});
	});

	it("usa NSU host e instituição quando os campos preferidos faltam", () => {
		const extraidos = extrairCamposSitef([
			{ tipoCampo: TIPO_CAMPO.nsuHost, valor: "HOST88" },
			{ tipoCampo: TIPO_CAMPO.autorizacaoAlt, valor: "Z1" },
			{ tipoCampo: TIPO_CAMPO.instituicao, valor: "MASTERCARD" },
		]);
		assert.equal(extraidos.nsu, "HOST88");
		assert.equal(extraidos.autorizacao, "Z1");
		assert.equal(extraidos.bandeira, "MASTERCARD");
	});

	it("ignora buffer vazio", () => {
		assert.deepEqual(extrairCamposSitef([{ tipoCampo: 121, valor: "   " }]), {
			nsu: null,
			autorizacao: null,
			bandeira: null,
		});
	});
});

describe("resultadoParaLancamento + somarLancamentos", () => {
	it("monta lançamento CARTAO e soma dois cartões", () => {
		const a = resultadoParaLancamento(60, {
			nsu: "111",
			autorizacao: "A1",
			bandeira: "VISA",
		});
		const b = resultadoParaLancamento(40, {
			nsu: "222",
			autorizacao: "A2",
			bandeira: "MASTER",
		});
		assert.equal(a.meio, "CARTAO");
		assert.equal(a.status, "ok");
		assert.equal(a.nsu, "111");
		assert.equal(somarLancamentos([a, b]), 100);
	});
});

describe("mensagemRetornoSitef", () => {
	it("traduz códigos conhecidos", () => {
		assert.match(mensagemRetornoSitef(0), /aprovada/i);
		assert.match(mensagemRetornoSitef(-2), /cancelada/i);
		assert.match(mensagemRetornoSitef(12345), /12345/);
	});
});
