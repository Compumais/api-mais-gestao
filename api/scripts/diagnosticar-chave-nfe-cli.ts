/**
 * Diagnóstico local de consulta NF-e por chave (DF-e + situação SEFAZ).
 *
 * Uso:
 *   tsx scripts/diagnosticar-chave-nfe-cli.ts --listar
 *   tsx scripts/diagnosticar-chave-nfe-cli.ts --idempresa <uuid> --chave <44 dígitos>
 */
import "dotenv/config";
import { desc, eq } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";
import {
	consultarDistribuicaoDfePorChaveGateway,
	consultarSituacaoChaveSefazGateway,
	verificarSaudeNfeGateway,
} from "../src/lib/nfe-gateway-client.js";
import { db } from "../src/repositories/connection.js";
import { montarCredenciaisGatewayNfe } from "../src/service/nfe-emissao/montar-credenciais-gateway-nfe.js";
import {
	buscarXmlNfePorChave,
	ErroBuscaXmlNfePorChave,
} from "../src/service/nfe-inbound/buscar-xml-nfe-por-chave.js";
import { normalizarCnpj } from "../src/util/criptografia-certificado.js";
import { decodificarChaveNfe } from "../src/util/decodificar-chave-nfe.js";

function obterArg(nome: string): string | undefined {
	const indice = process.argv.indexOf(nome);
	if (indice === -1) return undefined;
	return process.argv[indice + 1];
}

function descreverAmbiente(ambiente: number | null | undefined): string {
	if (ambiente === 1) return "Produção";
	if (ambiente === 2) return "Homologação";
	return ambiente === null || ambiente === undefined ? "—" : String(ambiente);
}

async function listarEmpresasFiscais() {
	const linhas = await db
		.select({
			id: schema.empresa.id,
			nome: schema.empresa.nome,
			cnpj: schema.empresa.cnpj,
			uf: schema.empresafiscal.uf,
			ambiente: schema.nfeconfiguracao.ambiente,
			certCnpj: schema.certificadodigital.cnpjcertificado,
			certValidade: schema.certificadodigital.validadefim,
		})
		.from(schema.empresa)
		.leftJoin(
			schema.empresafiscal,
			eq(schema.empresafiscal.idempresa, schema.empresa.id),
		)
		.leftJoin(
			schema.nfeconfiguracao,
			eq(schema.nfeconfiguracao.idempresa, schema.empresa.id),
		)
		.leftJoin(
			schema.certificadodigital,
			eq(
				schema.certificadodigital.id,
				schema.nfeconfiguracao.idcertificadoativo,
			),
		)
		.limit(50);

	console.log("\n=== Empresas (NF-e) ===\n");
	for (const linha of linhas) {
		console.log(`ID: ${linha.id}`);
		console.log(`  Nome: ${linha.nome}`);
		console.log(`  CNPJ empresa: ${linha.cnpj}`);
		console.log(`  UF fiscal: ${linha.uf ?? "—"}`);
		console.log(`  Ambiente NF-e: ${descreverAmbiente(linha.ambiente)}`);
		console.log(`  CNPJ certificado: ${linha.certCnpj ?? "—"}`);
		console.log(`  Validade cert.: ${linha.certValidade ?? "—"}`);
		console.log("");
	}

	const recentes = await db
		.select({
			idempresa: schema.nfeinbounddocumento.idempresa,
			chavenfe: schema.nfeinbounddocumento.chavenfe,
			status: schema.nfeinbounddocumento.statusimportacao,
			criadoem: schema.nfeinbounddocumento.criadoem,
		})
		.from(schema.nfeinbounddocumento)
		.orderBy(desc(schema.nfeinbounddocumento.criadoem))
		.limit(10);

	if (recentes.length > 0) {
		console.log("=== Últimos documentos inbound (Captura SEFAZ) ===\n");
		for (const doc of recentes) {
			console.log(
				`  ${doc.criadoem?.slice(0, 19) ?? "?"} | empresa ${doc.idempresa} | ${doc.chavenfe} | status ${doc.status}`,
			);
		}
	}
}

async function diagnosticar(idempresa: string, chaveNfe: string) {
	const gatewayOk = await verificarSaudeNfeGateway();
	console.log(
		`\nGateway NF-e (${process.env.NFE_GATEWAY_URL ?? "127.0.0.1:8088"}): ${gatewayOk ? "OK" : "INDISPONÍVEL"}`,
	);

	const decodificada = decodificarChaveNfe(chaveNfe.replace(/\D/g, ""));
	if (decodificada) {
		console.log("\n=== Chave decodificada ===");
		console.log(
			`  UF emitente: ${decodificada.siglaUf} (${decodificada.codigoUf})`,
		);
		console.log(`  CNPJ emitente (fornecedor): ${decodificada.cnpjEmitente}`);
		console.log(
			`  Modelo: ${decodificada.modelo} | Série: ${decodificada.serie} | Número: ${decodificada.numero}`,
		);
		console.log(
			`  DV válido: ${decodificada.digitoVerificadorValido ? "sim" : "NÃO — chave pode estar errada"}`,
		);
	}

	const credenciais = await montarCredenciaisGatewayNfe(idempresa);
	if (credenciais.ok) {
		console.log("\n=== Empresa / certificado (consulta) ===");
		console.log(
			`  CNPJ consultado (configJson): ${credenciais.configJson.cnpj}`,
		);
		console.log(
			`  Ambiente NF-e: ${descreverAmbiente(credenciais.nfeConfiguracao.ambiente)}`,
		);
		if (decodificada) {
			const cnpjEmpresa = normalizarCnpj(credenciais.configJson.cnpj);
			const cnpjEmitente = decodificada.cnpjEmitente;
			const mesmaBase = cnpjEmpresa.slice(0, 8) === cnpjEmitente.slice(0, 8);
			console.log(`  CNPJ emitente (chave): ${cnpjEmitente}`);
			console.log(
				`  Emitente ≠ destinatário esperado: ${cnpjEmitente !== cnpjEmpresa ? "sim (normal em compra)" : "CNPJ emitente = empresa logada — você pode estar importando nota de VENDA própria?"}`,
			);
			if (cnpjEmitente === cnpjEmpresa) {
				console.log(
					"  ⚠ A chave é de nota emitida PELA sua empresa. DF-e por chave como destinatário não se aplica.",
				);
			}
			if (!mesmaBase) {
				console.log(
					"  ℹ Destinatário não está na chave — confirme no DANFE/XML se dest/CNPJ = CNPJ da empresa logada.",
				);
			}
		}
	} else {
		console.log("\n=== Credenciais ===");
		for (const p of credenciais.pendencias) {
			console.log(`  [${p.codigo}] ${p.mensagem}`);
		}
	}

	const chaveLimpa = chaveNfe.replace(/\D/g, "");

	if (credenciais.ok) {
		console.log("\n=== Distribuição DF-e (consChNFe) ===");
		const dfe = await consultarDistribuicaoDfePorChaveGateway({
			configJson: credenciais.configJson,
			pfxBase64: credenciais.pfxBase64,
			senha: credenciais.senha,
			chaveNfe: chaveLimpa,
		});
		console.log(`  sucesso gateway: ${dfe.sucesso}`);
		console.log(`  cStat: ${dfe.cStat ?? "—"}`);
		console.log(`  xMotivo: ${dfe.xMotivo ?? "—"}`);
		console.log(`  docZip: ${dfe.docZip?.length ?? 0} documento(s)`);

		console.log("\n=== Consulta situação (consSitNFe) ===");
		const situacao = await consultarSituacaoChaveSefazGateway({
			configJson: credenciais.configJson,
			pfxBase64: credenciais.pfxBase64,
			senha: credenciais.senha,
			chaveNfe: chaveLimpa,
		});
		console.log(`  sucesso gateway: ${situacao.sucesso}`);
		console.log(`  cStat: ${situacao.cStat ?? "—"}`);
		console.log(`  xMotivo: ${situacao.xMotivo ?? "—"}`);
		if (situacao.erro) console.log(`  erro: ${situacao.erro}`);
	}

	console.log("\n=== Tentativa buscarXmlNfePorChave (fluxo completo) ===");
	try {
		const resultado = await buscarXmlNfePorChave({ idempresa, chaveNfe });
		console.log(
			`  SUCESSO — tipo: ${resultado.tipo}, XML ${resultado.xml.length} chars`,
		);
	} catch (erro) {
		if (erro instanceof ErroBuscaXmlNfePorChave) {
			console.log(`  FALHA — codigo: ${erro.codigo}`);
			console.log(`  cStat DF-e: ${erro.cStat ?? "—"}`);
			console.log(`  Mensagem: ${erro.message}`);
			if (erro.consultaSituacao) {
				console.log(
					`  Consulta situação: [${erro.consultaSituacao.cStat}] ${erro.consultaSituacao.xMotivo ?? ""}`,
				);
				if (erro.consultaSituacao.cStat === "100") {
					console.log(
						"\n  >>> CASO IDENTIFICADO: Nota AUTORIZADA na SEFAZ, mas XML indisponível na Distribuição DF-e para este CNPJ.",
					);
					console.log(
						"  >>> Ação: Importar XML do fornecedor (aba Importar XML).",
					);
				} else if (erro.cStat === "137" || erro.cStat === "217") {
					console.log(
						"\n  >>> CASO PROVÁVEL: CNPJ destinatário da nota ≠ empresa/certificado consultado, ou nota nunca entrou na fila DF-e deste CNPJ.",
					);
				} else if (erro.codigo === "RESUMO_APENAS") {
					console.log(
						"\n  >>> CASO: SEFAZ retornou só resumo (resNFe). Ciência da operação necessária antes do XML completo.",
					);
				}
			}
		} else {
			console.error(erro);
		}
	}
}

async function main() {
	if (process.argv.includes("--listar")) {
		await listarEmpresasFiscais();
		return;
	}

	const idempresa = obterArg("--idempresa");
	const chave = obterArg("--chave");

	if (!idempresa || !chave) {
		console.error(
			"Uso:\n  tsx scripts/diagnosticar-chave-nfe-cli.ts --listar\n  tsx scripts/diagnosticar-chave-nfe-cli.ts --idempresa <uuid> --chave <44 dígitos>",
		);
		process.exit(1);
	}

	await diagnosticar(idempresa, chave);
}

main()
	.then(() => process.exit(0))
	.catch((erro) => {
		console.error(erro);
		process.exit(1);
	});
