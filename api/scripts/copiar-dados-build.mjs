import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const origem = join(rootDir, "../src/data/cfop-padrao.json");
const destinoDir = join(rootDir, "../dist/src/data");
const destino = join(destinoDir, "cfop-padrao.json");

await mkdir(destinoDir, { recursive: true });
await copyFile(origem, destino);
