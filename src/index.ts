import cors from "@fastify/cors";
import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import { authRotas } from "./controllers/http/auth/rotas.js";
import { authenticationRoute } from "./controllers/http/authentication.js";
import { clientesRotas } from "./controllers/http/clientes/rotas.js";
import { contaCorrenteRotas } from "./controllers/http/contacorrente/rotas.js";
import { empresasRotas } from "./controllers/http/empresas/rotas.js";
import { planoContasRotas } from "./controllers/http/plano-contas/rotas.js";

export const app = Fastify({ logger: true });

app.register(cors, {
	// origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
	maxAge: 86400,
});

app.route({
	method: ["GET", "POST"],
	url: "/api/auth/*",
	async handler(request: FastifyRequest, reply: FastifyReply) {
		await authenticationRoute(request, reply);
	},
});

app.route({
	method: "GET",
	url: "/health",
	async handler(_request: FastifyRequest, reply: FastifyReply) {
		reply.status(200).send({ status: "Ok" });
	},
});

app.register(planoContasRotas);
app.register(empresasRotas);
app.register(clientesRotas);
app.register(authRotas);
app.register(contaCorrenteRotas);

app.listen({ port: 3333 }).then(() => {
	console.log("HTTP server running on port 3333");
});
