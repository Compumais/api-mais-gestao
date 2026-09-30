import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	classeContainerCatalogo,
	normalizarLayoutCatalogo,
} from "../../src/lib/catalogo-layout.ts";

describe("catalogo layout", () => {
	it("normaliza valores desconhecidos para grade", () => {
		assert.equal(normalizarLayoutCatalogo(undefined), "grade");
		assert.equal(normalizarLayoutCatalogo(""), "grade");
		assert.equal(normalizarLayoutCatalogo("cards"), "grade");
		assert.equal(normalizarLayoutCatalogo("lista"), "lista");
	});

	it("usa container em coluna no modo lista", () => {
		assert.match(classeContainerCatalogo("lista"), /flex-col/);
		assert.match(classeContainerCatalogo("grade", "balcao"), /grid-cols-/);
	});
});
