import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { upsertConfigFinanceiroEmpresa, buscarConfigFinanceiroEmpresa } from "@/repositories/config-financeiro-empresa-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido } from "@/util/http-util.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";

export async function configFinanceiroEmpresaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/config-financeiro-empresa", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const { idempresa } = z.object({ idempresa: z.string() }).parse(request.query);
			const permitido = await verificarUsuarioPertenceEmpresa(
				request.user.id,
				idempresa,
			);
			if (!permitido) {
				return reply.status(httpProibido().status).send(httpProibido());
			}
			const config =
				(await buscarConfigFinanceiroEmpresa(idempresa)) ??
				({
					idempresa,
					competenciadataref: "emissao",
					percentualtoleranciaorcamentocc: "0",
					bloqueardespesaacimaorcamento: false,
				} as const);
			return reply.status(200).send(config);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.put("/config-financeiro-empresa", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const body = z
				.object({
					idempresa: z.string(),
					competenciadataref: z.enum(["emissao", "vencimento"]).optional(),
					percentualtoleranciaorcamentocc: z.coerce.number().min(0).max(100).optional(),
					bloqueardespesaacimaorcamento: z.boolean().optional(),
				})
				.parse(request.body);
			const permitido = await verificarUsuarioPertenceEmpresa(
				request.user.id,
				body.idempresa,
			);
			if (!permitido) {
				return reply.status(httpProibido().status).send(httpProibido());
			}
			const existente = await buscarConfigFinanceiroEmpresa(body.idempresa);
			const config = await upsertConfigFinanceiroEmpresa({
				id: existente?.id ?? uuidv4(),
				idempresa: body.idempresa,
				competenciadataref:
					body.competenciadataref ??
					existente?.competenciadataref ??
					"emissao",
				percentualtoleranciaorcamentocc:
					body.percentualtoleranciaorcamentocc?.toFixed(2) ??
					existente?.percentualtoleranciaorcamentocc ??
					"0",
				bloqueardespesaacimaorcamento:
					body.bloqueardespesaacimaorcamento ??
					existente?.bloqueardespesaacimaorcamento ??
					false,
				currenttimemillis: Date.now(),
			});
			return reply.status(200).send(config);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});
}
