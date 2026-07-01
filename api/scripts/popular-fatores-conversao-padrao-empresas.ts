import dotenv from "dotenv";
import { listarEmpresas } from "../src/repositories/empresa-repositories.js";
import { criarFatoresConversaoPadraoService } from "../src/service/fator-conversao/criar-fatores-conversao-padrao.js";

dotenv.config();

const LIMITE_POR_PAGINA = 50;

async function popularFatoresConversaoPadraoEmpresas() {
	let pagina = 1;
	let empresasAtualizadas = 0;
	let empresasIgnoradas = 0;

	while (true) {
		const { empresas, total } = await listarEmpresas({
			page: pagina,
			limit: LIMITE_POR_PAGINA,
		});

		for (const empresa of empresas) {
			const fatoresCriados = await criarFatoresConversaoPadraoService(
				empresa.id,
			);

			if (fatoresCriados.length > 0) {
				console.log(
					`[OK] ${empresa.nome} (${empresa.id}): fator padrão 1:1 criado`,
				);
				empresasAtualizadas += 1;
				continue;
			}

			console.log(
				`[SKIP] ${empresa.nome} (${empresa.id}): já possui fatores de conversão`,
			);
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

popularFatoresConversaoPadraoEmpresas().catch((erro) => {
	console.error("Erro ao popular fatores de conversão padrão:", erro);
	process.exit(1);
});
