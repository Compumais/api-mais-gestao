import type { FastifyInstance } from "fastify";
import { baixarArquivoUpdatePdv } from "./baixar-arquivo.js";
import { obterManifestoUpdatePdv } from "./obter-manifesto.js";

export async function pdvUpdatesRotas(app: FastifyInstance) {
	app.get("/pdv/updates/version.json", {
		schema: {
			tags: ["pdv-updates"],
			summary: "Manifesto de atualização do PDV",
			description:
				"Retorna version.json do auto-update do PDV. Rota pública (sem JWT). Lê de PDV_UPDATES_PATH ou fallback embutido.",
			response: {
				200: {
					type: "object",
					properties: {
						version: { type: "string" },
						artifact: { type: "string" },
						url: { type: "string" },
						releasedAt: { type: "string" },
					},
					required: ["version", "artifact", "url"],
				},
				404: {
					type: "object",
					properties: {
						error: { type: "string" },
						code: { type: "string" },
					},
				},
			},
		},
		handler: obterManifestoUpdatePdv,
	});

	app.get<{ Params: { arquivo: string } }>("/pdv/updates/:arquivo", {
		schema: {
			tags: ["pdv-updates"],
			summary: "Download de artefato do PDV",
			description:
				"Serve Setup.exe ou outros arquivos publicados em PDV_UPDATES_PATH. Rota pública (sem JWT).",
			params: {
				type: "object",
				properties: {
					arquivo: { type: "string" },
				},
				required: ["arquivo"],
			},
		},
		handler: baixarArquivoUpdatePdv,
	});
}
