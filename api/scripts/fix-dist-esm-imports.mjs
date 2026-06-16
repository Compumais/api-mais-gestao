import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(rootDir, "../dist");

const importPattern =
	/(from|export \* from) (['"])(\.\.?\/[^'"]+?)\2/g;

function corrigirImports(conteudo) {
	return conteudo.replace(importPattern, (match, keyword, quote, path) => {
		if (path.endsWith(".js") || path.endsWith(".json")) {
			return match;
		}

		return `${keyword} ${quote}${path}.js${quote}`;
	});
}

async function processarArquivo(filePath) {
	const conteudo = await readFile(filePath, "utf8");
	const atualizado = corrigirImports(conteudo);

	if (atualizado !== conteudo) {
		await writeFile(filePath, atualizado, "utf8");
	}
}

async function walk(dir) {
	const entries = await readdir(dir);

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const info = await stat(fullPath);

		if (info.isDirectory()) {
			await walk(fullPath);
			continue;
		}

		if (entry.endsWith(".js")) {
			await processarArquivo(fullPath);
		}
	}
}

const schemaDirLegado = join(distDir, "src/repositories/schema");
try {
	await stat(schemaDirLegado);
	const { rm } = await import("node:fs/promises");
	await rm(schemaDirLegado, { recursive: true, force: true });
} catch {
	// diretório legado não existe
}

await walk(distDir);
