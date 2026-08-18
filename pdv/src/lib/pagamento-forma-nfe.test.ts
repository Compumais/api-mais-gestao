import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meioNativoDaFormaNfe } from "./pagamento";

describe("meioNativoDaFormaNfe", () => {
	it("mapeia códigos da NF-e para os meios nativos do PDV", () => {
		assert.equal(meioNativoDaFormaNfe("01"), "DINHEIRO");
		assert.equal(meioNativoDaFormaNfe("17"), "PIX");
		assert.equal(meioNativoDaFormaNfe("03"), "CARTAO");
		assert.equal(meioNativoDaFormaNfe("04"), "CARTAO");
		assert.equal(meioNativoDaFormaNfe("15"), null);
		assert.equal(meioNativoDaFormaNfe(null), null);
	});
});
