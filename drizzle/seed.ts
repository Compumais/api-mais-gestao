import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import * as relations from "./relations.js";
import * as schema from "./schema.js";

dotenv.config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema, ...relations });

async function seed() {
	try {
		console.log("🌱 Iniciando seed...");

		const agora = new Date().toISOString();
		const timestampMillis = Date.now();

		// Criar usuários
		console.log("📝 Criando usuários...");
		const usuarioAdminId = uuidv4();
		const usuarioComumId = uuidv4();

		await db.insert(schema.usuarios).values([
			{
				id: usuarioAdminId,
				nome: "Usuário Admin",
				email: "admin@maisgestao.com",
				emailverificado: true,
				perfil: "proprietario",
				criadoem: agora,
				atualizadoem: agora,
				maxempresas: 10,
			},
			{
				id: usuarioComumId,
				nome: "Usuário Comum",
				email: "usuario@maisgestao.com",
				emailverificado: true,
				perfil: "usuario",
				criadoem: agora,
				atualizadoem: agora,
				maxempresas: 5,
			},
		]);

		// Criar contas (Better Auth armazena senhas aqui)
		console.log("🔐 Criando contas com senhas...");
		const senhaHash = await bcrypt.hash("12345678", 10);

		await db.insert(schema.contas).values([
			{
				id: uuidv4(),
				idconta: usuarioAdminId,
				idprovedor: "credential",
				idusuario: usuarioAdminId,
				password: senhaHash,
				createdAt: agora,
				updatedAt: agora,
			},
			{
				id: uuidv4(),
				idconta: usuarioComumId,
				idprovedor: "credential",
				idusuario: usuarioComumId,
				password: senhaHash,
				createdAt: agora,
				updatedAt: agora,
			},
		]);

		// Criar empresas
		console.log("🏢 Criando empresas...");
		const empresa1Id = uuidv4();
		const empresa2Id = uuidv4();

		await db.insert(schema.empresa).values([
			{
				id: empresa1Id,
				nome: "Empresa Exemplo LTDA",
				cnpj: "12345678000190",
				telefone: "(11) 99999-9999",
				idproprietario: usuarioAdminId,
				criadoEm: agora,
				atualizadoEm: agora,
			},
			{
				id: empresa2Id,
				nome: "Segunda Empresa ME",
				cnpj: "98765432000111",
				telefone: "(11) 88888-8888",
				idproprietario: usuarioComumId,
				criadoEm: agora,
				atualizadoEm: agora,
			},
		]);

		// Criar relacionamentos usuário-empresa
		console.log("🔗 Criando relacionamentos usuário-empresa...");
		await db.insert(schema.usuarioEmpresa).values([
			{
				id: uuidv4(),
				idusuario: usuarioAdminId,
				idempresa: empresa1Id,
				criadoEm: agora,
				atualizadoEm: agora,
			},
			{
				id: uuidv4(),
				idusuario: usuarioComumId,
				idempresa: empresa2Id,
				criadoEm: agora,
				atualizadoEm: agora,
			},
		]);

		// Criar entidades (clientes/fornecedores)
		console.log("👤 Criando entidades...");
		await db.insert(schema.entidade).values([
			{
				id: uuidv4(),
				nome: "Cliente Exemplo 1",
				razaosocial: "Cliente Exemplo 1 LTDA",
				tipopessoa: 1, // 1 = Pessoa Jurídica
				cnpjcpf: "12345678000111",
				inscricaoestadual: "123456789",
				rg: "",
				email: "cliente1@exemplo.com",
				telefone: "(11) 77777-7777",
				endereco: "Rua Exemplo",
				numeroendereco: "123",
				complemento: "",
				bairro: "Centro",
				cep: "012345",
				pais: "Brasil",
				idempresa: empresa1Id,
				criadoEm: agora,
				atualizadoEm: agora,
			},
			{
				id: uuidv4(),
				nome: "Cliente Exemplo 2",
				razaosocial: "Cliente Exemplo 2 ME",
				tipopessoa: 1, // 1 = Pessoa Jurídica
				cnpjcpf: "98765432000122",
				inscricaoestadual: "987654321",
				rg: "",
				email: "cliente2@exemplo.com",
				telefone: "(11) 66666-6666",
				endereco: "Av. Teste",
				numeroendereco: "456",
				complemento: "",
				bairro: "Copacabana",
				cep: "200000",
				pais: "Brasil",
				idempresa: empresa1Id,
				criadoEm: agora,
				atualizadoEm: agora,
			},
		]);

		// Criar plano de contas
		console.log("📊 Criando plano de contas...");
		const planoContas1Id = uuidv4();
		const planoContas2Id = uuidv4();

		await db.insert(schema.planocontas).values([
			{
				id: planoContas1Id,
				idempresa: empresa1Id,
				codigo: "1.1.01",
				nome: "Caixa",
				tipomovimento: "D",
				inativo: 0,
				classe: "01",
				currenttimemillis: timestampMillis,
				centrocustoobrigatorio: 0,
				tipoconta: 1,
				exportaparacontabilidade: 1,
			},
			{
				id: planoContas2Id,
				idempresa: empresa1Id,
				codigo: "1.1.02",
				nome: "Banco Conta Movimento",
				tipomovimento: "D",
				inativo: 0,
				classe: "01",
				currenttimemillis: timestampMillis,
				centrocustoobrigatorio: 0,
				tipoconta: 1,
				exportaparacontabilidade: 1,
				idplanocontas: planoContas1Id, // Referência ao plano pai
			},
		]);

		// Criar conta corrente
		console.log("💳 Criando contas correntes...");
		const contaCorrenteId = uuidv4();

		await db.insert(schema.contacorrente).values({
			id: contaCorrenteId,
			descricao: "Conta Corrente Principal",
			idempresa: empresa1Id,
			codigo: 1,
			idbanco: 341,
			agencia: "1234",
			numeroconta: "12345-6",
			razaosocial: "Empresa Exemplo LTDA",
			cnpj: "12345678000190",
			currenttimemillis: timestampMillis,
		});

		// Criar lançamentos de conta corrente
		console.log("📝 Criando lançamentos de conta corrente...");
		await db.insert(schema.contacorrentelancamento).values({
			id: uuidv4(),
			idcontacorrente: contaCorrenteId,
			datahora: new Date().toISOString().split("T")[0],
			tipo: "C",
			valor: "1000.00",
			saldoanterior: "0.00",
			saldoatual: "1000.00",
			historico: "Depósito inicial",
			idusuario: usuarioAdminId,
			evento: timestampMillis,
			currenttimemillis: timestampMillis,
		});
		await db.insert(schema.contacorrentelancamento).values({
			id: uuidv4(),
			idcontacorrente: contaCorrenteId,
			datahora: new Date().toISOString().split("T")[0],
			tipo: "D",
			valor: "250.00",
			saldoanterior: "1000.00",
			saldoatual: "750.00",
			historico: "Pagamento de fornecedor",
			idusuario: usuarioAdminId,
			evento: timestampMillis,
			currenttimemillis: timestampMillis,
		});

		// Criar tipo documento financeiro
		console.log("📄 Criando tipos de documento financeiro...");
		const tipoDocFinId = uuidv4();
		const tipoDocFinIdNumber = 1; // ID numérico para referência no financeiro

		await db.insert(schema.tipodocumentofinanceiro).values({
			id: tipoDocFinId,
			idempresa: empresa1Id,
			descricao: "Boleto Bancário",
			acao: 1,
			saidafechamento: 0,
			inativo: 0,
			integracaixabanco: 1,
			baixageracodigobanco: 1,
			currenttimemillis: timestampMillis,
			permitegerarboleto: 1,
			calcularencargofinanceiro: 1,
			juros: 1,
			multa: 1,
		});

		// Criar motivo baixa financeiro
		console.log("📋 Criando motivos de baixa financeiro...");
		const motivoBaixaId = uuidv4();

		await db.insert(schema.motivobaixafinanceiro).values({
			id: motivoBaixaId,
			idempresa: empresa1Id,
			descricao: "Pagamento Normal",
			inativo: 0,
			currenttimemillis: timestampMillis,
		});

		// Criar financeiro
		console.log("💰 Criando registros financeiros...");
		const financeiro1Id = uuidv4();
		const financeiro2Id = uuidv4();

		await db.insert(schema.financeiro).values({
			id: financeiro1Id,
			idempresa: empresa1Id,
			tipo: "R",
			status: "A",
			emissao: new Date().toISOString().split("T")[0],
			vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			valor: "5000.00",
			saldo: "5000.00",
			historico: "Recebimento de cliente",
			documento: "REC-001",
			currenttimemillis: timestampMillis,
		});
		await db.insert(schema.financeiro).values({
			id: financeiro2Id,
			idempresa: empresa1Id,
			tipo: "P",
			status: "A",
			emissao: new Date().toISOString().split("T")[0],
			vencimento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			valor: "2000.00",
			saldo: "2000.00",
			historico: "Pagamento a fornecedor",
			documento: "PAG-001",
			idtipodocumentofinanceiro: tipoDocFinIdNumber,
			currenttimemillis: timestampMillis,
		});

		// Criar lançamentos financeiros
		console.log("📊 Criando lançamentos financeiros...");
		await db.insert(schema.financeirolancamento).values({
			id: uuidv4(),
			idfinanceiro: financeiro1Id,
			valoranterior: "0.00",
			valor: "5000.00",
			evento: timestampMillis,
			currenttimemillis: timestampMillis,
		});
		await db.insert(schema.financeirolancamento).values({
			id: uuidv4(),
			idfinanceiro: financeiro2Id,
			valoranterior: "0.00",
			valor: "2000.00",
			evento: timestampMillis,
			currenttimemillis: timestampMillis,
		});

		// Criar audit logs
		console.log("📝 Criando logs de auditoria...");
		await db.insert(schema.auditLogs).values([
			{
				id: uuidv4(),
				acao: "CREATE",
				recurso: "empresa",
				idrecurso: empresa1Id,
				idusuario: usuarioAdminId,
				idempresa: empresa1Id,
				metadados: { nome: "Empresa Exemplo LTDA" },
				criadoEm: agora,
			},
			{
				id: uuidv4(),
				acao: "CREATE",
				recurso: "entidade",
				idusuario: usuarioAdminId,
				idempresa: empresa1Id,
				metadados: { nome: "Cliente Exemplo 1" },
				criadoEm: agora,
			},
		]);

		// Criar verificações (Better Auth)
		console.log("✅ Criando verificações...");
		const dataExpiracao = new Date();
		dataExpiracao.setDate(dataExpiracao.getDate() + 1); // Expira em 1 dia

		await db.insert(schema.verificacoes).values({
			id: uuidv4(),
			identifier: usuarioAdminId,
			value: "verification-token-example",
			expiresAt: dataExpiracao.toISOString(),
			createdAt: agora,
			updatedAt: agora,
		});

		console.log("✅ Seed concluído com sucesso!");
		console.log("\n📋 Resumo dos dados criados:");
		console.log("  - 2 usuários (admin e comum)");
		console.log("  - 2 contas com senha: 12345678");
		console.log("  - 2 empresas");
		console.log("  - 2 relacionamentos usuário-empresa");
		console.log("  - 2 entidades");
		console.log("  - 2 planos de contas");
		console.log("  - 1 conta corrente");
		console.log("  - 2 lançamentos de conta corrente");
		console.log("  - 1 tipo de documento financeiro");
		console.log("  - 1 motivo de baixa financeiro");
		console.log("  - 2 registros financeiros");
		console.log("  - 2 lançamentos financeiros");
		console.log("  - 2 logs de auditoria");
		console.log("  - 1 verificação");
	} catch (error) {
		console.error("❌ Erro ao executar seed:", error);
		throw error;
	} finally {
		await pool.end();
	}
}

seed();
