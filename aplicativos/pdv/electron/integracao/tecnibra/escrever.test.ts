import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { escreverArquivoAtomico } from "./escrever";

describe("escreverArquivoAtomico", () => {
	it("falha de escrita não derruba o processo", async () => {
		const bloqueio = join(tmpdir(), `tecnibra-nao-dir-${Date.now()}`);
		await writeFile(bloqueio, "arquivo no lugar da pasta");
		await assert.rejects(() =>
			escreverArquivoAtomico(join(bloqueio, "Comandas.xml"), "<Comandas />\n"),
		);
	});
});
