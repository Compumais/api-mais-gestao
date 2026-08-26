/**
 * Religa itens de NF-e já autorizadas ao cadastro (COD_ITEM / idproduto)
 * e copia ICMS-ST do XML autorizado para as colunas do item (C170/C190).
 *
 * Uso (na pasta api/, contra o banco do .env):
 *   tsx scripts/corrigir-itens-efd-nfe.ts --cnpj 52720549000154 --numeros 57,58
 *   tsx scripts/corrigir-itens-efd-nfe.ts --cnpj 52720549000154 --numeros 57,58 --aplicar
 */
import "dotenv/config";
import { corrigirItensNfeParaEfd } from "../src/service/efd-icms/corrigir-itens-nfe-efd.js";

function obterArg(nome: string): string | undefined {
	const indice = process.argv.indexOf(nome);
	if (indice === -1) return undefined;
	return process.argv[indice + 1];
}

async function main() {
	const cnpj = obterArg("--cnpj");
	const numerosArg = obterArg("--numeros");
	const aplicar = process.argv.includes("--aplicar");

	if (!cnpj || !numerosArg) {
		console.error(
			"Uso:\n  tsx scripts/corrigir-itens-efd-nfe.ts --cnpj <cnpj> --numeros 57,58 [--aplicar]",
		);
		process.exit(1);
	}

	const numeros = numerosArg
		.split(",")
		.map((numero) => numero.trim())
		.filter(Boolean);

	const correcoes = await corrigirItensNfeParaEfd({
		cnpj,
		numeros,
		aplicar,
	});

	console.log(
		aplicar
			? "\n=== Aplicado no banco ===\n"
			: "\n=== Dry-run (nada gravado). Confira e rode de novo com --aplicar ===\n",
	);

	for (const linha of correcoes) {
		console.log(
			`NF ${linha.numeroNota} item ${linha.contador}: ${linha.descricao}`,
		);
		console.log(
			`  idproduto=${linha.idproduto ?? "—"}  produto=${linha.produto ?? "—"}`,
		);
		console.log(
			`  ST base=${linha.baseicmsst ?? "—"}  valor=${linha.valoricmsst ?? "—"}  aliq=${linha.aliquotaicmsst ?? "—"}`,
		);
		console.log(`  ${linha.motivo}\n`);
	}

	console.log(`${correcoes.length} item(ns).`);
}

main()
	.then(() => process.exit(0))
	.catch((erro) => {
		console.error(erro);
		process.exit(1);
	});
