import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const origemCfop = join(rootDir, "../src/data/cfop-padrao.json");
const origemTaxa = join(rootDir, "../src/data/taxauf-padrao.json");
const destinoDir = join(rootDir, "../dist/src/data");
const destinoCfop = join(destinoDir, "cfop-padrao.json");
const destinoTaxa = join(destinoDir, "taxauf-padrao.json");

await mkdir(destinoDir, { recursive: true });
await copyFile(origemCfop, destinoCfop);
await copyFile(origemTaxa, destinoTaxa);
