import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { TIPO_PARAMETRO_CRITERIO_RATEIO } from "@/constants/centro-custo.js";
import {
	buscarCriterioRateioCompleto,
	excluirCriterioRateio,
	listarCriteriosRateio,
} from "@/repositories/criterio-rateio-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { salvarCriterioRateioService } from "@/service/criterio-rateio/salvar-criterio-rateio.js";
import { httpErroInterno, httpNaoAutorizado, httpOk, httpProibido, httpSemConteudo } from "@/util/http-util.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";

const linhaSchema = z.object({
	idcentrocusto: z.string(),
	percentual: z.coerce.number().optional().nullable(),
	peso: z.coerce.number().optional().nullable(),
	ordem: z.coerce.number().optional(),
});

const salvarSchema = z.object({
	idempresa: z.string(),
	nome: z.string().max(80),
	tipoparametro: z.enum(TIPO_PARAMETRO_CRITERIO_RATEIO),
	ativo: z.coerce.number().optional(),
	observacao: z.string().optional().nullable(),
	linhas: z.array(linhaSchema).min(1),
});

export async function criterioRateioRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/criterios-rateio", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const query = z
				.object({
					idempresa: z.string(),
					ativo: z.coerce.number().optional(),
				})
				.parse(request.query);
			const permitido = await verificarUsuarioPertenceEmpresa(
				request.user.id,
				query.idempresa,
			);
			if (!permitido) {
				return reply.status(httpProibido().status).send(httpProibido());
			}
			const data = await listarCriteriosRateio(query);
			return reply.status(200).send({ data });
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.get("/criterios-rateio/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const { id } = z.object({ id: z.string() }).parse(request.params);
			const data = await buscarCriterioRateioCompleto(id);
			if (!data) {
				return reply.status(404).send({ error: "Critério não encontrado" });
			}
			return reply.status(200).send(data);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.post("/criterios-rateio", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const body = salvarSchema.parse(request.body);
			const resultado = await salvarCriterioRateioService({
				idusuario: request.user.id,
				...body,
			});
			if (!resultado.success) {
				return reply.status(resultado.status).send(resultado);
			}
			return reply.status(resultado.status).send(resultado.body);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.put("/criterios-rateio/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const { id } = z.object({ id: z.string() }).parse(request.params);
			const body = salvarSchema.parse(request.body);
			const resultado = await salvarCriterioRateioService({
				idusuario: request.user.id,
				id,
				...body,
			});
			if (!resultado.success) {
				return reply.status(resultado.status).send(resultado);
			}
			return reply.status(resultado.status).send(resultado.body);
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});

	app.delete("/criterios-rateio/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			if (!request.user) {
				return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
			}
			const { id } = z.object({ id: z.string() }).parse(request.params);
			await excluirCriterioRateio(id);
			const resp = httpSemConteudo();
			return reply.status(resp.status).send();
		} catch (error) {
			console.error(error);
			return reply.status(httpErroInterno().status).send(httpErroInterno());
		}
	});
}
