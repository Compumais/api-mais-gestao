import { eq } from "drizzle-orm";
import type { ConfiguracaoPdv } from "@/model/configuracao-pdv-model.js";
import { configuracaopdv } from "@/repositories/schema.js";
import { db } from "./connection";

export async function buscarConfiguracaoPdvPorEmpresa(idempresa: string) {
	const [configuracao] = await db
		.select()
		.from(configuracaopdv)
		.where(eq(configuracaopdv.idempresa, idempresa))
		.limit(1);

	return configuracao;
}

export async function salvarConfiguracaoPdv(dados: ConfiguracaoPdv) {
	const [configuracao] = await db
		.insert(configuracaopdv)
		.values(dados)
		.onConflictDoUpdate({
			target: configuracaopdv.idempresa,
			set: {
				modeloatendimento: dados.modeloatendimento,
				etiquetabalancahabilitada: dados.etiquetabalancahabilitada,
				etiquetabalancaprefixo: dados.etiquetabalancaprefixo,
				etiquetabalancadigitoscodigo: dados.etiquetabalancadigitoscodigo,
				etiquetabalancaconteudo: dados.etiquetabalancaconteudo,
				etiquetabalancacentavos: dados.etiquetabalancacentavos,
				etiquetabalancaindicadoruso: dados.etiquetabalancaindicadoruso,
				vendasemestoque: dados.vendasemestoque,
				atualizadoem: dados.atualizadoem,
			},
		})
		.returning();

	return configuracao;
}
