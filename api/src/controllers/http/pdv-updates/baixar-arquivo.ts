import { createReadStream } from "node:fs";
import { basename } from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolverArquivoUpdatePdvService } from "@/service/pdv-updates/obter-manifesto-update-pdv.js";

type Params = {
	arquivo: string;
};

export async function baixarArquivoUpdatePdv(
	request: FastifyRequest<{ Params: Params }>,
	reply: FastifyReply,
) {
	try {
		const resultado = await resolverArquivoUpdatePdvService(
			request.params.arquivo,
		);
		if (!resultado.success) {
			return reply.status(resultado.status).send({
				error: resultado.error,
				code: resultado.code,
			});
		}
		if (!resultado.body) {
			return reply.status(404).send({
				error: "Arquivo não encontrado",
				code: "NOT_FOUND_ERROR",
			});
		}

		const { caminho, contentType } = resultado.body;
		const nome = basename(caminho);
		reply.header("Cache-Control", "no-cache");
		reply.header("Content-Type", contentType);
		if (!nome.endsWith(".json")) {
			reply.header(
				"Content-Disposition",
				`attachment; filename="${nome}"`,
			);
		}
		return reply.send(createReadStream(caminho));
	} catch (error) {
		console.error(error);
		return reply.status(500).send({
			error: "Erro interno",
			code: "INTERNAL_SERVER_ERROR",
		});
	}
}
