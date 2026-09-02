import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));
const origemCfop = join(rootDir, "../src/data/cfop-padrao.json");
const origemTaxa = join(rootDir, "../src/data/taxauf-padrao.json");
const origemCest = join(rootDir, "../drizzle/seeds/cest-seed.data.json");
const origemPdvVersion = join(
	rootDir,
	"../src/data/pdv-updates/version.json",
);
const destinoDir = join(rootDir, "../dist/src/data");
const destinoPdvUpdatesDir = join(destinoDir, "pdv-updates");
const destinoCfop = join(destinoDir, "cfop-padrao.json");
const destinoTaxa = join(destinoDir, "taxauf-padrao.json");
const destinoCest = join(destinoDir, "cest-globais.json");
const destinoPdvVersion = join(destinoPdvUpdatesDir, "version.json");

await mkdir(destinoDir, { recursive: true });
await mkdir(destinoPdvUpdatesDir, { recursive: true });
await copyFile(origemCfop, destinoCfop);
await copyFile(origemTaxa, destinoTaxa);
await copyFile(origemCest, destinoCest);
await copyFile(origemPdvVersion, destinoPdvVersion);
