import dotenv from "dotenv";
import { listarEmpresas } from "../src/repositories/empresa-repositories.js";
import { criarCfopsPadraoService } from "../src/service/cfop/criar-cfops-padrao.js";
import { criarParametrizacaoTributosPadraoService } from "../src/service/parametrizacao-tributos/criar-parametrizacao-tributos-padrao.js";

dotenv.config();

const LIMITE_POR_PAGINA = 50;

async function popularParametrizacaoTributosPadraoEmpresas() {
	let pagina = 1;
	let empresasAtualizadas = 0;
	let empresasIgnoradas = 0;
	let cfopsCriadosTotal = 0;

	while (true) {
		const { empresas, total } = await listarEmpresas({
			page: pagina,
			limit: LIMITE_POR_PAGINA,
		});

		for (const empresa of empresas) {
			const cfopsCriados = await criarCfopsPadraoService(empresa.id);
			if (cfopsCriados.length > 0) {
				cfopsCriadosTotal += cfopsCriados.length;
				console.log(
					`[CFOP] ${empresa.nome} (${empresa.id}): ${cfopsCriados.length} CFOPs criados`,
				);
			}

			const regrasCriadas =
				await criarParametrizacaoTributosPadraoService(empresa.id);

			if (regrasCriadas.length > 0) {
				console.log(
					`[OK] ${empresa.nome} (${empresa.id}): ${regrasCriadas.length} regras de parametrização criadas`,
				);
				empresasAtualizadas += 1;
				continue;
			}

			console.log(
				`[SKIP] ${empresa.nome} (${empresa.id}): já possui parametrização de tributos`,
			);
			empresasIgnoradas += 1;
		}

		if (pagina * LIMITE_POR_PAGINA >= total) {
			break;
		}

		pagina += 1;
	}

	console.log(
		`\nConcluído. ${empresasAtualizadas} empresa(s) atualizada(s), ${empresasIgnoradas} ignorada(s), ${cfopsCriadosTotal} CFOP(s) criados como pré-requisito.`,
	);
}

popularParametrizacaoTributosPadraoEmpresas().catch((erro) => {
	console.error("Erro ao popular parametrização de tributos padrão:", erro);
	process.exit(1);
});
