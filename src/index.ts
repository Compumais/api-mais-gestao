import cors from "@fastify/cors";
import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import { authenticationRoute } from "./controllers/authentication.js";
import { planoContasRotas } from "./controllers/plano-contas/rotas.js";

export const app = Fastify({ logger: true });

app.register(cors, {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
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

app.listen({ port: 3333 }).then(() => {
	console.log("HTTP server running on port 3333");
});
