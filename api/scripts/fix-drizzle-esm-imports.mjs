import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(rootDir, "../drizzle");

const importPattern = /(from|export \* from) (['"])(\.\/[^'"]+)\2/g;

async function processFile(filePath) {
	const content = await readFile(filePath, "utf8");
	const updated = content.replace(importPattern, (match, keyword, quote, path) => {
		if (path.endsWith(".js")) {
			return match;
		}

		return `${keyword} ${quote}${path}.js${quote}`;
	});

	if (updated !== content) {
		await writeFile(filePath, updated, "utf8");
		console.log(`Atualizado: ${filePath}`);
	}
}

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			await walk(fullPath);
			continue;
		}

		if (entry.name.endsWith(".ts")) {
			await processFile(fullPath);
		}
	}
}

await walk(drizzleDir);
