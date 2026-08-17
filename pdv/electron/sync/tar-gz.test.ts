import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { gunzipSync } from "node:zlib";
import { compactarPastaTarGz } from "./tar-gz";

describe("compactarPastaTarGz", () => {
	it("gera arquivo gzip com o conteúdo dos arquivos", async () => {
		const pasta = await mkdtemp(join(tmpdir(), "pdv-tar-"));
		const destino = join(pasta, "backup.tar.gz");
		const origem = join(pasta, "origem");
		const { mkdir } = await import("node:fs/promises");
		await mkdir(join(origem, "xml-nfce"), { recursive: true });
		await writeFile(join(origem, "xml-nfce", "nota.xml"), "<NFe />", "utf8");
		try {
			await compactarPastaTarGz(origem, destino);
			const compactado = await readFile(destino);
			assert.ok(compactado.length > 20);
			const tar = gunzipSync(compactado);
			assert.ok(tar.includes(Buffer.from("nota.xml")));
			assert.ok(tar.includes(Buffer.from("<NFe />")));
		} finally {
			await rm(pasta, { recursive: true, force: true });
		}
	});
});
