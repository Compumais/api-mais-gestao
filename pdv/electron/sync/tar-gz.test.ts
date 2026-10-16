import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { gunzipSync } from "node:zlib";
import { compactarPastaTarGz, extrairPastaTarGz } from "./tar-gz";

describe("compactarPastaTarGz", () => {
	it("gera arquivo gzip com o conteúdo dos arquivos", async () => {
		const pasta = await mkdtemp(join(tmpdir(), "pdv-tar-"));
		const destino = join(pasta, "backup.tar.gz");
		const origem = join(pasta, "origem");
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

	it("extrai o mesmo conteúdo compactado", async () => {
		const pasta = await mkdtemp(join(tmpdir(), "pdv-tar-"));
		const arquivo = join(pasta, "backup.tar.gz");
		const origem = join(pasta, "origem");
		const destino = join(pasta, "destino");
		await mkdir(join(origem, "tabelas"), { recursive: true });
		await writeFile(join(origem, "manifesto.json"), '{"motivo":"teste"}\n', "utf8");
		await writeFile(join(origem, "tabelas", "venda.json"), "[]\n", "utf8");
		try {
			await compactarPastaTarGz(origem, arquivo);
			await extrairPastaTarGz(arquivo, destino);
			assert.equal(
				await readFile(join(destino, "manifesto.json"), "utf8"),
				'{"motivo":"teste"}\n',
			);
			assert.equal(
				await readFile(join(destino, "tabelas", "venda.json"), "utf8"),
				"[]\n",
			);
		} finally {
			await rm(pasta, { recursive: true, force: true });
		}
	});
});
