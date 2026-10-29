import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	avaliarEmissaoNfcePorPagamento,
	MEIOS_PAGAMENTO_NFCE_PADRAO,
	normalizarMeiosPagamentoNfce,
	parseMeiosPagamentoNfceConfig,
	resumoPagamentoParaNfce,
} from "./meios-pagamento-nfce";

describe("emissão NFC-e por meio de pagamento", () => {
	it("não emite quando só dinheiro está desmarcado", () => {
		const resumo = resumoPagamentoParaNfce({
			valordinheiro: 50,
			valortroco: 10,
		});
		const avaliacao = avaliarEmissaoNfcePorPagamento(resumo, {
			...MEIOS_PAGAMENTO_NFCE_PADRAO,
			dinheiro: false,
		});
		assert.equal(resumo.dinheiro, 40);
		assert.equal(avaliacao.deveEmitir, false);
		assert.deepEqual(avaliacao.meiosUtilizados, ["dinheiro"]);
	});

	it("emite o total se algum meio marcado foi usado", () => {
		const resumo = resumoPagamentoParaNfce({
			valordinheiro: 20,
			valorpix: 30,
		});
		const avaliacao = avaliarEmissaoNfcePorPagamento(resumo, {
			...MEIOS_PAGAMENTO_NFCE_PADRAO,
			dinheiro: false,
		});
		assert.equal(avaliacao.deveEmitir, true);
		assert.deepEqual(avaliacao.meiosUtilizados, ["dinheiro", "pix"]);
	});

	it("parseia JSON inválido para o padrão da retaguarda", () => {
		assert.deepEqual(
			parseMeiosPagamentoNfceConfig("{"),
			MEIOS_PAGAMENTO_NFCE_PADRAO,
		);
		assert.equal(
			normalizarMeiosPagamentoNfce({ dinheiro: false }).dinheiro,
			false,
		);
	});
});
