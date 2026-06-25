import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";
import { db } from "../src/repositories/connection.js";
import { cest } from "./schema.js";

dotenv.config();

const ARQUIVO_DADOS = join(process.cwd(), "drizzle/seeds/cest-seed.data.json");
const TAMANHO_LOTE = 200;

type CestSeedItem = {
	id: number;
	codigo: string;
	descricao: string;
	descricaoncm: string;
	currenttimemillis: number;
	inativo: number;
};

type ArquivoCestSeed = {
	cest: CestSeedItem[];
};

function gerarIdGlobal(indice: number): string {
	const sufixo = String(indice).padStart(12, "0");
	return `c0000001-0000-4000-8000-${sufixo}`;
}

function normalizarCodigoCest(codigo: string): string {
	return codigo.replace(/\D/g, "");
}

async function seedCestGlobais() {
	console.log("📦 Inserindo CEST globais...");

	const conteudo = readFileSync(ARQUIVO_DADOS, "utf-8");
	const dados = JSON.parse(conteudo) as ArquivoCestSeed;

	if (!Array.isArray(dados.cest) || dados.cest.length === 0) {
		throw new Error("Arquivo de seed CEST inválido ou vazio");
	}

	const registros = dados.cest.map((item, indice) => ({
		id: gerarIdGlobal(indice + 1),
		idempresa: null,
		codigo: normalizarCodigoCest(item.codigo),
		descricao: item.descricao.trim(),
		descricaoncm: item.descricaoncm.trim(),
		inativo: item.inativo ?? 0,
	}));

	for (let inicio = 0; inicio < registros.length; inicio += TAMANHO_LOTE) {
		const lote = registros.slice(inicio, inicio + TAMANHO_LOTE);
		await db.insert(cest).values(lote).onConflictDoNothing({ target: cest.id });
	}

	console.log(`  ✅ ${registros.length} registros CEST processados`);
}

seedCestGlobais()
	.then(() => {
		console.log("\n✅ Seed CEST concluído com sucesso!");
	})
	.catch((erro) => {
		console.error("❌ Erro ao executar seed CEST:", erro);
		process.exit(1);
	});
