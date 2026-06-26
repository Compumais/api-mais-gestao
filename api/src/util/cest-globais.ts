import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NovoCEST } from "@/model/cest-mode.js";
import {
	contarCestsGlobais,
	criarCestsEmLote,
} from "@/repositories/cest-repositories.js";

type CestGlobaisJsonItem = {
	codigo: string;
	descricao: string;
	descricaoncm: string;
	inativo: number;
};

type CestGlobaisArquivo = {
	cest: CestGlobaisJsonItem[];
};

function gerarIdGlobal(indice: number): string {
	const sufixo = String(indice).padStart(12, "0");
	return `c0000001-0000-4000-8000-${sufixo}`;
}

function normalizarCodigoCest(codigo: string): string {
	return codigo.replace(/\D/g, "");
}

function resolverArquivoCestGlobais(): string {
	const relativoBuild = join(
		dirname(fileURLToPath(import.meta.url)),
		"../data/cest-globais.json",
	);

	if (existsSync(relativoBuild)) {
		return relativoBuild;
	}

	return join(process.cwd(), "drizzle/seeds/cest-seed.data.json");
}

function carregarCestsGlobaisJson(): CestGlobaisArquivo {
	const conteudo = readFileSync(resolverArquivoCestGlobais(), "utf-8");
	const dados = JSON.parse(conteudo) as CestGlobaisArquivo;

	if (!Array.isArray(dados.cest) || dados.cest.length === 0) {
		throw new Error("Arquivo de CEST globais inválido ou vazio");
	}

	return dados;
}

export function montarCestsGlobais(): NovoCEST[] {
	const dados = carregarCestsGlobaisJson();

	return dados.cest.map((item, indice) => ({
		id: gerarIdGlobal(indice + 1),
		idempresa: null,
		codigo: normalizarCodigoCest(item.codigo),
		descricao: item.descricao.trim(),
		descricaoncm: item.descricaoncm.trim(),
		inativo: item.inativo ?? 0,
	}));
}

export async function garantirCestsGlobais(): Promise<void> {
	const totalExistente = await contarCestsGlobais();

	if (totalExistente > 0) {
		return;
	}

	const registros = montarCestsGlobais();
	await criarCestsEmLote(registros);
}
