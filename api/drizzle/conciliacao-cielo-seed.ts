import * as dotenv from "dotenv";
import { and, eq, like, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/repositories/connection.js";
import {
	buscarContaCorrenteCaixaPadrao,
	criarContaCorrenteCaixaPadrao,
} from "../src/repositories/conta-corrente-repositories.js";
import { buscarEmpresasDoUsuario } from "../src/repositories/entidade-repositories.js";
import { buscarPlanoContasPorCodigo } from "../src/repositories/plano-contas-repositories.js";
import { criarPlanoContasPadraoService } from "../src/service/planocontas/criar-plano-contas-padrao.js";
import { CODIGO_PLANO_VENDAS_DINHEIRO } from "../src/util/recebimentos-venda-util.js";
import * as schema from "./schema.js";

dotenv.config();

const EMAIL_PADRAO = "cesar@compumais.com";
const PREFIXO_DOCUMENTO = "SEED-CIELO-";
const PREFIXO_HISTORICO = "[SEED-CIELO]";

/**
 * Amostra alinhada ao CSV Recebiveis_cielo_detalhe (primeiros lançamentos).
 * historico/extra1/extra2 carregam NSU e autorização para o match automático.
 */
const RECEBIVEIS_SEED = [
	{
		nsu: "387740",
		autorizacao: "MDCNGJ",
		bandeira: "Visa",
		valor: 79.0,
		datavenda: "2026-09-26",
		datapagamento: "2026-10-27",
		parcela: 1,
		totalparcelas: 1,
		forma: "Crédito à vista",
	},
	{
		nsu: "387739",
		autorizacao: "908311",
		bandeira: "Mastercard",
		valor: 78.14,
		datavenda: "2026-09-26",
		datapagamento: "2026-10-27",
		parcela: 1,
		totalparcelas: 4,
		forma: "Crédito parcelado loja 01/04",
	},
	{
		nsu: "207095",
		autorizacao: "654157",
		bandeira: "Elo",
		valor: 207.29,
		datavenda: "2026-03-27",
		datapagamento: "2026-10-28",
		parcela: 7,
		totalparcelas: 10,
		forma: "Crédito parcelado loja 07/10",
	},
	{
		nsu: "387866",
		autorizacao: "134853",
		bandeira: "Visa",
		valor: 117.4,
		datavenda: "2026-10-29",
		datapagamento: "2026-10-30",
		parcela: 1,
		totalparcelas: 1,
		forma: "Débito à vista",
	},
	{
		nsu: "387287",
		autorizacao: "084253",
		bandeira: "Mastercard",
		valor: 116.58,
		datavenda: "2026-06-05",
		datapagamento: "2026-11-03",
		parcela: 5,
		totalparcelas: 5,
		forma: "Crédito parcelado loja 05/05",
	},
	{
		nsu: "387872",
		autorizacao: "048945",
		bandeira: "Visa",
		valor: 55.0,
		datavenda: "2026-10-30",
		datapagamento: "2026-11-03",
		parcela: 1,
		totalparcelas: 1,
		forma: "Débito à vista",
	},
	{
		nsu: "387882",
		autorizacao: "251129",
		bandeira: "Elo",
		valor: 208.5,
		datavenda: "2026-10-31",
		datapagamento: "2026-11-03",
		parcela: 1,
		totalparcelas: 1,
		forma: "Débito à vista",
	},
	{
		nsu: "387540",
		autorizacao: "788522",
		bandeira: "Mastercard",
		valor: 45.0,
		datavenda: "2026-08-06",
		datapagamento: "2026-11-05",
		parcela: 3,
		totalparcelas: 3,
		forma: "Crédito parcelado loja 03/03",
	},
	{
		nsu: "387655",
		autorizacao: "751274",
		bandeira: "Visa",
		valor: 89.6,
		datavenda: "2026-09-05",
		datapagamento: "2026-11-05",
		parcela: 2,
		totalparcelas: 5,
		forma: "Crédito parcelado loja 02/05",
	},
	{
		nsu: "387889",
		autorizacao: "789419",
		bandeira: "Visa",
		valor: 193.94,
		datavenda: "2026-11-04",
		datapagamento: "2026-11-05",
		parcela: 1,
		totalparcelas: 1,
		forma: "Débito à vista",
	},
	{
		nsu: "387885",
		autorizacao: "219617",
		bandeira: "Mastercard",
		valor: 55.0,
		datavenda: "2026-11-04",
		datapagamento: "2026-11-05",
		parcela: 1,
		totalparcelas: 1,
		forma: "Débito à vista",
	},
	{
		nsu: "387888",
		autorizacao: "491872",
		bandeira: "Mastercard",
		valor: 134.15,
		datavenda: "2026-11-04",
		datapagamento: "2026-11-05",
		parcela: 1,
		totalparcelas: 1,
		forma: "Débito à vista",
	},
] as const;

function formatarValor(valor: number) {
	return valor.toFixed(2);
}

async function buscarUsuarioPorEmail(email: string) {
	const [usuario] = await db
		.select()
		.from(schema.usuarios)
		.where(eq(schema.usuarios.email, email))
		.limit(1);
	return usuario;
}

async function seedJaExecutado(idempresa: string) {
	const [resultado] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				like(schema.financeiro.documento, `${PREFIXO_DOCUMENTO}%`),
			),
		);
	return (resultado?.total ?? 0) > 0;
}

async function removerSeedAnterior(idempresa: string) {
	await db
		.delete(schema.financeiro)
		.where(
			and(
				eq(schema.financeiro.idempresa, idempresa),
				like(schema.financeiro.documento, `${PREFIXO_DOCUMENTO}%`),
			),
		);
}

async function garantirClienteSeed(idempresa: string) {
	const [existente] = await db
		.select({ id: schema.entidade.id })
		.from(schema.entidade)
		.where(
			and(
				eq(schema.entidade.idempresa, idempresa),
				eq(schema.entidade.nome, "Cliente Seed Cielo"),
			),
		)
		.limit(1);

	if (existente) return existente.id;

	const id = uuidv4();
	const agora = new Date().toISOString();
	await db.insert(schema.entidade).values({
		id,
		idempresa,
		nome: "Cliente Seed Cielo",
		razaosocial: "Cliente Seed Cielo LTDA",
		tipopessoa: 1,
		cliente: 1,
		cnpjcpf: "21450424000128",
		atualizadoem: agora,
	});
	return id;
}

async function seedConciliacaoCielo() {
	const email = process.env.SEED_EMAIL?.trim() || EMAIL_PADRAO;
	const forcar = process.env.SEED_FORCE === "1";

	console.log(`Seed conciliação Cielo para: ${email}\n`);

	const usuario = await buscarUsuarioPorEmail(email);
	if (!usuario) {
		throw new Error(`Usuário não encontrado: ${email}`);
	}

	const empresasIds = await buscarEmpresasDoUsuario(usuario.id);
	if (empresasIds.length === 0) {
		throw new Error(`Nenhuma empresa vinculada ao usuário ${email}`);
	}

	const idempresa = empresasIds[0]!;
	const [empresa] = await db
		.select({ id: schema.empresa.id, nome: schema.empresa.nome })
		.from(schema.empresa)
		.where(eq(schema.empresa.id, idempresa))
		.limit(1);

	console.log(`  Empresa: ${empresa?.nome ?? idempresa}`);
	console.log(`  ID: ${idempresa}\n`);

	await criarPlanoContasPadraoService(idempresa);

	let caixa = await buscarContaCorrenteCaixaPadrao(idempresa);
	if (!caixa) {
		caixa = await criarContaCorrenteCaixaPadrao(idempresa);
	}
	if (!caixa) {
		throw new Error("Não foi possível obter a conta caixa padrão");
	}

	const jaExecutado = await seedJaExecutado(idempresa);
	if (jaExecutado && !forcar) {
		console.log(
			"  Seed já existe. Use SEED_FORCE=1 para recriar os títulos SEED-CIELO-*.",
		);
		return;
	}
	if (jaExecutado && forcar) {
		console.log("  Removendo títulos SEED-CIELO anteriores...");
		await removerSeedAnterior(idempresa);
	}

	const plano = await buscarPlanoContasPorCodigo(
		idempresa,
		CODIGO_PLANO_VENDAS_DINHEIRO,
	);
	if (!plano) {
		throw new Error(`Plano ${CODIGO_PLANO_VENDAS_DINHEIRO} não encontrado`);
	}

	const idcliente = await garantirClienteSeed(idempresa);

	console.log(`  Inserindo ${RECEBIVEIS_SEED.length} contas a receber...`);

	for (const [indice, item] of RECEBIVEIS_SEED.entries()) {
		const documento = `${PREFIXO_DOCUMENTO}${String(indice + 1).padStart(3, "0")}`;
		const historico = `${PREFIXO_HISTORICO} ${item.forma} NSU ${item.nsu} auth ${item.autorizacao}`;

		await db.insert(schema.financeiro).values({
			id: uuidv4(),
			idempresa,
			identidade: idcliente,
			tipo: "R",
			status: "A",
			emissao: item.datavenda,
			vencimento: item.datapagamento,
			vencimentooriginal: item.datapagamento,
			registro: `${item.datavenda}T12:00:00.000Z`,
			valor: formatarValor(item.valor),
			saldo: formatarValor(item.valor),
			historico,
			documento,
			emitente: "Cliente Seed Cielo",
			nomebandeira: item.bandeira,
			parcela: item.parcela,
			totalparcelas: item.totalparcelas,
			extra1: item.nsu,
			extra2: item.autorizacao,
			idplanocontas: plano.id,
			currenttimemillis: Date.now() + indice,
		});
	}

	console.log("\nSeed Cielo concluído!");
	console.log(`  - ${RECEBIVEIS_SEED.length} títulos a receber abertos`);
	console.log(`  - Conta corrente sugerida na confirmação: ${caixa.descricao ?? caixa.id}`);
	console.log(
		"  - Importe o CSV Recebiveis_cielo_detalhe em Financeiro > Conciliação Cielo",
	);
	console.log(
		"  - Os primeiros lançamentos do CSV devem sugerir match automaticamente",
	);
}

seedConciliacaoCielo().catch((error) => {
	console.error("Erro no seed Cielo:", error);
	process.exit(1);
});
