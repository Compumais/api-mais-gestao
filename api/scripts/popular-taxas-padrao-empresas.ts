import dotenv from "dotenv";
import { listarEmpresas } from "../src/repositories/empresa-repositories.js";
import { criarTaxasPadraoService } from "../src/service/taxauf/criar-taxas-padrao.js";

dotenv.config();

const LIMITE_POR_PAGINA = 50;

async function popularTaxasPadraoEmpresas() {
	let pagina = 1;
	let empresasAtualizadas = 0;
	let empresasIgnoradas = 0;

	while (true) {
		const { empresas, total } = await listarEmpresas({
			page: pagina,
			limit: LIMITE_POR_PAGINA,
		});

		for (const empresa of empresas) {
			const taxasCriadas = await criarTaxasPadraoService(empresa.id);

			if (taxasCriadas.length > 0) {
				console.log(
					`[OK] ${empresa.nome} (${empresa.id}): ${taxasCriadas.length} taxas criadas`,
				);
				empresasAtualizadas += 1;
				continue;
			}

			console.log(`[SKIP] ${empresa.nome} (${empresa.id}): já possui taxas`);
			empresasIgnoradas += 1;
		}

		if (pagina * LIMITE_POR_PAGINA >= total) {
			break;
		}

		pagina += 1;
	}

	console.log(
		`\nConcluído. ${empresasAtualizadas} empresa(s) atualizada(s), ${empresasIgnoradas} ignorada(s).`,
	);
}

popularTaxasPadraoEmpresas().catch((erro) => {
	console.error("Erro ao popular taxas padrão:", erro);
	process.exit(1);
});
