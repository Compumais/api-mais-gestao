/**
 * Religa itens de NF-e já autorizadas ao cadastro (COD_ITEM / idproduto)
 * e copia ICMS-ST do XML autorizado para as colunas do item (C170/C190).
 *
 * Uso (na pasta api/, contra o banco do .env):
 *   tsx scripts/corrigir-itens-efd-nfe.ts --cnpj 52720549000154 --numeros 57,58
 *   tsx scripts/corrigir-itens-efd-nfe.ts --cnpj 52720549000154 --periodo 2026-08
 *   tsx scripts/corrigir-itens-efd-nfe.ts --cnpj 52720549000154 --periodo 2026-08 --aplicar
 */
import "dotenv/config";
import { corrigirItensNfeParaEfd } from "../src/service/efd-icms/corrigir-itens-nfe-efd.js";

function obterArg(nome: string): string | undefined {
	const indice = process.argv.indexOf(nome);
	if (indice === -1) return undefined;
	return process.argv[indice + 1];
}

function intervaloMes(periodo: string): {
	dataInicio: string;
	dataFim: string;
} {
	const match = /^(\d{4})-(\d{2})$/.exec(periodo.trim());
	if (!match) {
		throw new Error("Use --periodo no formato YYYY-MM (ex.: 2026-08).");
	}
	const ano = Number(match[1]);
	const mes = Number(match[2]);
	const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
	const mm = String(mes).padStart(2, "0");
	return {
		dataInicio: `${ano}-${mm}-01`,
		dataFim: `${ano}-${mm}-${String(ultimo).padStart(2, "0")}`,
	};
}

async function main() {
	const cnpj = obterArg("--cnpj");
	const numerosArg = obterArg("--numeros");
	const periodo = obterArg("--periodo");
	const aplicar = process.argv.includes("--aplicar");

	if (!cnpj || (!numerosArg && !periodo)) {
		console.error(
			"Uso:\n  tsx scripts/corrigir-itens-efd-nfe.ts --cnpj <cnpj> --numeros 57,58 [--aplicar]\n  tsx scripts/corrigir-itens-efd-nfe.ts --cnpj <cnpj> --periodo 2026-08 [--aplicar]",
		);
		process.exit(1);
	}

	const numeros = numerosArg
		? numerosArg
				.split(",")
				.map((numero) => numero.trim())
				.filter(Boolean)
		: undefined;
	const intervalo = periodo ? intervaloMes(periodo) : undefined;

	const correcoes = await corrigirItensNfeParaEfd({
		cnpj,
		numeros,
		dataInicio: intervalo?.dataInicio,
		dataFim: intervalo?.dataFim,
		aplicar,
	});

	if (correcoes.length === 0) {
		console.log("Nenhum item sem código/ST para corrigir no filtro informado.");
		return;
	}

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
