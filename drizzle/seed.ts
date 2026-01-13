import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../src/lib/auth.js";
import { db } from "../src/repositories/connection.js";
import * as schema from "./schema.js";

dotenv.config();

async function seed() {
	try {
		console.log("🌱 Iniciando seed...");

		const agora = new Date().toISOString();
		const timestampMillis = Date.now();

		// Criar usuários usando Better Auth
		console.log("📝 Criando usuários com Better Auth...");

		let usuarioAdminId: string;
		let usuarioComumId: string;

		try {
			// Criar usuário admin
			const adminResult = await auth.api.signUpEmail({
				body: {
					name: "Usuário Admin",
					email: "admin@maisgestao.com",
					password: "12345678",
				},
			});

			if (adminResult.user?.id) {
				usuarioAdminId = adminResult.user.id;
				// Atualizar perfil e maxempresas
				await db
					.update(schema.usuarios)
					.set({
						perfil: "proprietario",
						maxempresas: 10,
					})
					.where(eq(schema.usuarios.id, usuarioAdminId));
				console.log("  ✅ Usuário admin criado");
			} else {
				throw new Error("Falha ao criar usuário admin");
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorCode =
				error && typeof error === "object" && "code" in error
					? String(error.code)
					: "";

			if (errorMessage.includes("already exists") || errorCode === "23505") {
				console.log("  ⚠️  Usuário admin já existe, buscando ID...");
				const [usuarioExistente] = await db
					.select()
					.from(schema.usuarios)
					.where(eq(schema.usuarios.email, "admin@maisgestao.com"))
					.limit(1);
				if (usuarioExistente) {
					usuarioAdminId = usuarioExistente.id;
				} else {
					throw error;
				}
			} else {
				throw error;
			}
		}

		try {
			// Criar usuário comum
			const comumResult = await auth.api.signUpEmail({
				body: {
					name: "Usuário Comum",
					email: "usuario@maisgestao.com",
					password: "12345678",
				},
			});

			if (comumResult.user?.id) {
				usuarioComumId = comumResult.user.id;
				// Atualizar perfil e maxempresas
				await db
					.update(schema.usuarios)
					.set({
						perfil: "usuario",
						maxempresas: 5,
					})
					.where(eq(schema.usuarios.id, usuarioComumId));
				console.log("  ✅ Usuário comum criado");
			} else {
				throw new Error("Falha ao criar usuário comum");
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			const errorCode =
				error && typeof error === "object" && "code" in error
					? String(error.code)
					: "";

			if (errorMessage.includes("already exists") || errorCode === "23505") {
				console.log("  ⚠️  Usuário comum já existe, buscando ID...");
				const [usuarioExistente] = await db
					.select()
					.from(schema.usuarios)
					.where(eq(schema.usuarios.email, "usuario@maisgestao.com"))
					.limit(1);
				if (usuarioExistente) {
					usuarioComumId = usuarioExistente.id;
				} else {
					throw error;
				}
			} else {
				throw error;
			}
		}

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
				criadoem: agora,
				atualizadoem: agora,
			},
			{
				id: empresa2Id,
				nome: "Segunda Empresa ME",
				cnpj: "98765432000111",
				telefone: "(11) 88888-8888",
				idproprietario: usuarioComumId,
				criadoem: agora,
				atualizadoem: agora,
			},
		]);

		// Criar relacionamentos usuário-empresa
		console.log("🔗 Criando relacionamentos usuário-empresa...");
		await db.insert(schema.usuarioEmpresa).values([
			{
				id: uuidv4(),
				idusuario: usuarioAdminId,
				idempresa: empresa1Id,
				criadoem: agora,
				atualizadoem: agora,
			},
			{
				id: uuidv4(),
				idusuario: usuarioComumId,
				idempresa: empresa2Id,
				criadoem: agora,
				atualizadoem: agora,
			},
		]);

		// Criar entidades (entidades/fornecedores)
		console.log("👤 Criando entidades...");
		await db.insert(schema.entidade).values([
			{
				id: uuidv4(),
				nome: "Entidade Exemplo 1",
				razaosocial: "Entidade Exemplo 1 LTDA",
				tipopessoa: 1, // 1 = Pessoa Jurídica
				cnpjcpf: "12345678000111",
				inscricaoestadual: "123456789",
				rg: "",
				email: "entidade1@exemplo.com",
				telefone: "(11) 77777-7777",
				endereco: "Rua Exemplo",
				numeroendereco: "123",
				complemento: "",
				bairro: "Centro",
				cep: "012345",
				pais: "Brasil",
				idempresa: empresa1Id,
				criadoem: agora,
				atualizadoem: agora,
			},
			{
				id: uuidv4(),
				nome: "Entidade Exemplo 2",
				razaosocial: "Entidade Exemplo 2 ME",
				tipopessoa: 1, // 1 = Pessoa Jurídica
				cnpjcpf: "98765432000122",
				inscricaoestadual: "987654321",
				rg: "",
				email: "entidade2@exemplo.com",
				telefone: "(11) 66666-6666",
				endereco: "Av. Teste",
				numeroendereco: "456",
				complemento: "",
				bairro: "Copacabana",
				cep: "200000",
				pais: "Brasil",
				idempresa: empresa1Id,
				criadoem: agora,
				atualizadoem: agora,
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
			historico: "Recebimento de entidade",
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
				criadoem: agora,
			},
			{
				id: uuidv4(),
				acao: "CREATE",
				recurso: "entidade",
				idusuario: usuarioAdminId,
				idempresa: empresa1Id,
				metadados: { nome: "Entidade Exemplo 1" },
				criadoem: agora,
			},
		]);

		console.log("✅ Seed concluído com sucesso!");
		console.log("\n📋 Resumo dos dados criados:");
		console.log("  - 2 usuários (admin e comum) com senha: 12345678");
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
	} catch (error) {
		console.error("❌ Erro ao executar seed:", error);
		throw error;
	}
}

seed();
