import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";
import { db } from "../src/repositories/connection.js";
import { BANCOS_PADRAO } from "../src/util/bancos-padrao.js";
import { UNIDADES_MEDIDA_PADRAO } from "../src/util/unidades-medida-padrao.js";
import * as schema from "./schema.js";

dotenv.config();

const ARQUIVO_CEST = join(process.cwd(), "drizzle/seeds/cest-seed.data.json");
const TAMANHO_LOTE_CEST = 200;

type CestSeedItem = {
	codigo: string;
	descricao: string;
	descricaoncm: string;
	inativo: number;
};

function gerarIdGlobal(prefixo: string, indice: number): string {
	const sufixo = String(indice).padStart(12, "0");
	return `${prefixo}0000001-0000-4000-8000-${sufixo}`;
}

async function seedUnidadesMedidaPadrao() {
	console.log("📏 Inserindo unidades de medida padrão...");

	const timestampMillis = Date.now();
	const registros = UNIDADES_MEDIDA_PADRAO.map((unidade, indice) => ({
		id: gerarIdGlobal("a", indice + 1),
		idempresa: null,
		codigo: unidade.codigo,
		nome: unidade.nome,
		casasdecimais: unidade.casasdecimais,
		tipovalor: unidade.tipovalor,
		currenttimemillis: timestampMillis,
	}));

	await db
		.insert(schema.unidademedida)
		.values(registros)
		.onConflictDoNothing({ target: schema.unidademedida.id });

	console.log(`  ✅ ${registros.length} unidades de medida processadas`);
}

async function seedBancosPadrao() {
	console.log("🏦 Inserindo bancos padrão...");

	const timestampMillis = Date.now();
	const registros = BANCOS_PADRAO.map((banco, indice) => ({
		id: gerarIdGlobal("b", indice + 1),
		idempresa: null,
		codigo: banco.codigo,
		nome: banco.nome,
		currenttimemillis: timestampMillis,
	}));

	await db
		.insert(schema.banco)
		.values(registros)
		.onConflictDoNothing({ target: schema.banco.id });

	console.log(`  ✅ ${registros.length} bancos processados`);
}

async function seedCestGlobais() {
	console.log("📦 Inserindo CEST globais...");

	const conteudo = readFileSync(ARQUIVO_CEST, "utf-8");
	const dados = JSON.parse(conteudo) as { cest: CestSeedItem[] };

	const registros = dados.cest.map((item, indice) => ({
		id: gerarIdGlobal("c", indice + 1),
		idempresa: null,
		codigo: item.codigo.replace(/\D/g, ""),
		descricao: item.descricao.trim(),
		descricaoncm: item.descricaoncm.trim(),
		inativo: item.inativo ?? 0,
	}));

	for (let inicio = 0; inicio < registros.length; inicio += TAMANHO_LOTE_CEST) {
		const lote = registros.slice(inicio, inicio + TAMANHO_LOTE_CEST);
		await db
			.insert(schema.cest)
			.values(lote)
			.onConflictDoNothing({ target: schema.cest.id });
	}

	console.log(`  ✅ ${registros.length} registros CEST processados`);
}

const seedsGlobais = [
	{ nome: "unidades de medida", executar: seedUnidadesMedidaPadrao },
	{ nome: "bancos", executar: seedBancosPadrao },
	{ nome: "CEST", executar: seedCestGlobais },
] as const;

async function seed() {
	try {
		console.log("🌱 Iniciando seed de dados globais...\n");

		for (const seedGlobal of seedsGlobais) {
			await seedGlobal.executar();
		}

		console.log("\n✅ Seed concluído com sucesso!");
		console.log("\n📋 Resumo:");
		console.log(`  - ${UNIDADES_MEDIDA_PADRAO.length} unidades de medida padrão`);
		console.log(`  - ${BANCOS_PADRAO.length} bancos padrão`);
		console.log(`  - CEST globais (arquivo oficial)`);
	} catch (error) {
		console.error("❌ Erro ao executar seed:", error);
		throw error;
	}
}

seed();
