import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";
import { eq, inArray, isNull, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/repositories/connection.js";
import * as schema from "./schema.js";

dotenv.config();

const ARQUIVO_DADOS = join(
	process.cwd(),
	"drizzle/seeds/products-seed.data.json",
);

type ProdutoPlanilha = {
	codigo: number;
	referencia: string | null;
	ean: number | string | null;
	nome: string;
	unidademedida: string | null;
	preco: number | null;
	estoque: number | null;
	custoaquisicao: number | null;
	precoultimacompra: number | null;
	dataultimacompra: string | null;
	customedioinicial: number | null;
	pesavel: number;
	ncm: string | null;
	iat: string | null;
	ippt: string | null;
	kit: number;
	idgrupo: string;
	icmsentrada: number | null;
	cest: number | null;
	tipoproduto: string | null;
	observacoes: string | null;
};

type ArquivoProductsSeed = {
	source: string;
	generatedAt: string;
	idempresa?: string;
	total: number;
	skipped: Array<{ linha: number; motivo: string }>;
	produtos: ProdutoPlanilha[];
};

function formatarEan(valor: number | string | null | undefined): string | null {
	if (valor === null || valor === undefined) {
		return null;
	}
	return String(valor);
}

function formatarNumerico(valor: number | null | undefined): string | null {
	if (valor === null || valor === undefined) {
		return null;
	}
	return valor.toFixed(2);
}

function carregarDados(): ArquivoProductsSeed {
	const conteudo = readFileSync(ARQUIVO_DADOS, "utf-8");
	return JSON.parse(conteudo) as ArquivoProductsSeed;
}

async function carregarMapaUnidadesMedida(idempresa: string) {
	const unidades = await db
		.select({
			id: schema.unidademedida.id,
			codigo: schema.unidademedida.codigo,
		})
		.from(schema.unidademedida)
		.where(
			or(
				isNull(schema.unidademedida.idempresa),
				eq(schema.unidademedida.idempresa, idempresa),
			),
		);

	const mapa = new Map<string, string>();
	for (const unidade of unidades) {
		if (unidade.codigo) {
			mapa.set(unidade.codigo.toUpperCase(), unidade.id);
		}
	}
	return mapa;
}

async function validarGruposExistentes(idsGrupo: string[]) {
	const grupos = await db
		.select({ id: schema.hierarquia.id })
		.from(schema.hierarquia)
		.where(inArray(schema.hierarquia.id, idsGrupo));

	return new Set(grupos.map((grupo) => grupo.id));
}

async function validarEmpresaExiste(idempresa: string) {
	const [empresaEncontrada] = await db
		.select({ id: schema.empresa.id })
		.from(schema.empresa)
		.where(eq(schema.empresa.id, idempresa))
		.limit(1);

	return !!empresaEncontrada;
}

async function seedProducts() {
	const dados = carregarDados();
	const idempresa =
		process.env.PRODUCTS_SEED_EMPRESA_ID ??
		process.env.PRODUTOS_SEED_EMPRESA_ID ??
		dados.idempresa;
	const dryRun =
		process.env.PRODUCTS_SEED_DRY_RUN === "true" ||
		process.env.PRODUTOS_SEED_DRY_RUN === "true";

	if (!idempresa) {
		throw new Error(
			"Defina PRODUCTS_SEED_EMPRESA_ID ou inclua idempresa em products-seed.data.json.",
		);
	}

	console.log("📦 Products seed — origem:", dados.source);
	console.log("   Registros:", dados.total);
	console.log("   Empresa:", idempresa);
	console.log("   Dry-run:", dryRun ? "sim" : "não");
	console.log(
		"   Nota: estoque da planilha não é inserido (coluna ausente em produção; use saldoestoque).",
	);
	console.log("");

	const empresaExiste = await validarEmpresaExiste(idempresa);
	if (!empresaExiste) {
		throw new Error(`Empresa não encontrada: ${idempresa}`);
	}

	const mapaUnidades = await carregarMapaUnidadesMedida(idempresa);
	const idsGrupo = Array.from(new Set(dados.produtos.map((p) => p.idgrupo)));
	const gruposExistentes = await validarGruposExistentes(idsGrupo);

	const unidadesAusentes = new Set<string>();
	const gruposAusentes = new Set<string>();

	const registros = dados.produtos.map((produto) => {
		const codigoUnidade = produto.unidademedida?.toUpperCase() ?? null;
		const idunidademedida = codigoUnidade
			? (mapaUnidades.get(codigoUnidade) ?? null)
			: null;

		if (codigoUnidade && !idunidademedida) {
			unidadesAusentes.add(codigoUnidade);
		}

		if (!gruposExistentes.has(produto.idgrupo)) {
			gruposAusentes.add(produto.idgrupo);
		}

		return {
			id: uuidv4(),
			idempresa,
			codigo: produto.codigo,
			referencia: produto.referencia,
			ean: formatarEan(produto.ean),
			nome: produto.nome,
			descricao: produto.nome.slice(0, 100),
			unidademedida: produto.unidademedida,
			idunidademedida,
			idgrupo: produto.idgrupo,
			preco: formatarNumerico(produto.preco),
			custoaquisicao: formatarNumerico(produto.custoaquisicao),
			precoultimacompra: formatarNumerico(produto.precoultimacompra),
			dataultimacompra: produto.dataultimacompra,
			customedioinicial: formatarNumerico(produto.customedioinicial),
			pesavel: produto.pesavel,
			ncm: produto.ncm,
			iat: produto.iat,
			ippt: produto.ippt ?? "T",
			kit: produto.kit,
			icmsentrada: formatarNumerico(produto.icmsentrada),
			cest: produto.cest,
			tipoproduto: produto.tipoproduto,
			observacoes: produto.observacoes,
			tipo: "P" as const,
			origem: 0,
			inativo: 0,
			enviamobile: 0,
		};
	});

	if (unidadesAusentes.size > 0) {
		console.warn(
			"⚠️  Unidades não encontradas (idunidademedida ficará null):",
			Array.from(unidadesAusentes).join(", "),
		);
	}

	if (gruposAusentes.size > 0) {
		throw new Error(
			`Grupos ausentes no banco: ${Array.from(gruposAusentes).slice(0, 5).join(", ")}${gruposAusentes.size > 5 ? "..." : ""}`,
		);
	}

	if (dryRun) {
		console.log("✅ Dry-run concluído. Nenhum registro inserido.");
		console.log(`   Produtos prontos: ${registros.length}`);
		return;
	}

	const tamanhoLote = 100;
	let inseridos = 0;

	for (let i = 0; i < registros.length; i += tamanhoLote) {
		const lote = registros.slice(i, i + tamanhoLote);
		await db.insert(schema.produtos).values(lote);
		inseridos += lote.length;
		console.log(`   Inseridos ${inseridos}/${registros.length}...`);
	}

	console.log("");
	console.log("✅ Products seed concluído!");
	console.log(`   Total inserido: ${inseridos}`);
	if (dados.skipped.length > 0) {
		console.log(`   Linhas ignoradas na planilha: ${dados.skipped.length}`);
	}
}

seedProducts().catch((error) => {
	console.error("❌ Erro no products seed:", error);
	process.exit(1);
});
