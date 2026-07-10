import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";
import { db } from "../src/repositories/connection.js";
import { servicosnfse } from "./schema.js";

dotenv.config();

const ARQUIVO_DADOS = join(
	process.cwd(),
	"drizzle/seeds/servicos-nfse-seed.data.json",
);
const TAMANHO_LOTE = 200;

type ServicoNfseSeedItem = {
	COD_LST: string;
	DESCRICAO: string;
	RESTRITO: string | null;
	COD_TRIBUTACAO: string | null;
	COD_LST_EXTRA: string | null;
};

type ArquivoServicosNfseSeed = {
	TB_EST_SERVICO_SIS: ServicoNfseSeedItem[];
};

function gerarIdGlobal(indice: number): string {
	const sufixo = String(indice).padStart(12, "0");
	return `s0000001-0000-4000-8000-${sufixo}`;
}

async function seedServicosNfseGlobais() {
	console.log("📋 Inserindo serviços NFS-e (LC 116) globais...");

	const conteudo = readFileSync(ARQUIVO_DADOS, "utf-8");
	const dados = JSON.parse(conteudo) as ArquivoServicosNfseSeed;

	if (
		!Array.isArray(dados.TB_EST_SERVICO_SIS) ||
		dados.TB_EST_SERVICO_SIS.length === 0
	) {
		throw new Error("Arquivo de seed serviços NFS-e inválido ou vazio");
	}

	const agora = new Date().toISOString();
	const registros = dados.TB_EST_SERVICO_SIS.map((item, indice) => ({
		id: gerarIdGlobal(indice + 1),
		idempresa: null,
		codigo: item.COD_LST.trim(),
		descricao: item.DESCRICAO.trim(),
		restrito: item.RESTRITO?.trim() ?? null,
		codigotributacao: item.COD_TRIBUTACAO?.trim() ?? null,
		codigoextra: item.COD_LST_EXTRA?.trim() ?? null,
		inativo: 0,
		atualizadoem: agora,
	}));

	for (let inicio = 0; inicio < registros.length; inicio += TAMANHO_LOTE) {
		const lote = registros.slice(inicio, inicio + TAMANHO_LOTE);
		await db
			.insert(servicosnfse)
			.values(lote)
			.onConflictDoNothing({ target: servicosnfse.id });
	}

	console.log(`  ✅ ${registros.length} serviços NFS-e processados`);
}

seedServicosNfseGlobais()
	.then(() => {
		console.log("\n✅ Seed serviços NFS-e concluído com sucesso!");
	})
	.catch((erro) => {
		console.error("❌ Erro ao executar seed serviços NFS-e:", erro);
		process.exit(1);
	});
