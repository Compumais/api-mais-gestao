import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
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

await app.register(swagger, {
	openapi: {
		info: {
			title: "API Mais Gestão",
			description: "API de controle financeiro empresarial",
			version: "1.0.0",
		},
		servers: [
			{
				url: "http://localhost:3333",
				description: "Servidor de desenvolvimento",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
		},
		tags: [
			{ name: "auth", description: "Operações de autenticação" },
			{ name: "clientes", description: "Operações com clientes" },
			{
				name: "contas-correntes",
				description: "Operações com contas correntes",
			},
			{ name: "empresas", description: "Operações com empresas" },
			{ name: "plano-contas", description: "Operações com plano de contas" },
		],
	},
});

await app.register(swaggerUi, {
	routePrefix: "/docs",
	uiConfig: {
		docExpansion: "list",
		deepLinking: false,
	},
	staticCSP: true,
	transformStaticCSP: (header) => header,
});

// Rotas específicas do Better Auth documentadas no Swagger
// Devem ser definidas após o registro do Swagger para aparecerem na documentação
app.route({
	method: "POST",
	url: "/api/auth/sign-in/email",
	schema: {
		tags: ["auth"],
		summary: "Fazer login com email e senha",
		description: "Autentica um usuário usando email e senha",
		body: {
			type: "object",
			required: ["email", "password"],
			properties: {
				email: {
					type: "string",
					format: "email",
					description: "Email do usuário",
				},
				password: {
					type: "string",
					minLength: 8,
					description: "Senha do usuário (mínimo 8 caracteres)",
				},
				rememberMe: {
					type: "boolean",
					description: "Manter sessão após fechar o navegador (padrão: true)",
					default: true,
				},
				callbackURL: {
					type: "string",
					description: "URL para redirecionar após login (opcional)",
				},
			},
		},
		response: {
			200: {
				type: "object",
				description: "Login realizado com sucesso",
				properties: {
					user: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							email: { type: "string" },
							emailVerified: { type: "boolean" },
							image: { type: "string", nullable: true },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
						},
					},
					session: {
						type: "object",
						properties: {
							id: { type: "string" },
							expiresAt: { type: "string" },
							token: { type: "string" },
							ipAddress: { type: "string", nullable: true },
							userAgent: { type: "string", nullable: true },
						},
					},
				},
			},
			400: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
			401: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
			403: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
		},
	},
	handler: async (request: FastifyRequest, reply: FastifyReply) => {
		await authenticationRoute(request, reply);
	},
});

app.route({
	method: "POST",
	url: "/api/auth/sign-up/email",
	schema: {
		tags: ["auth"],
		summary: "Criar conta com email e senha",
		description: "Registra um novo usuário usando email e senha",
		body: {
			type: "object",
			required: ["email", "password", "name"],
			properties: {
				email: {
					type: "string",
					format: "email",
					description: "Email do usuário",
				},
				password: {
					type: "string",
					minLength: 8,
					description: "Senha do usuário (mínimo 8 caracteres)",
				},
				name: {
					type: "string",
					description: "Nome do usuário",
				},
				image: {
					type: "string",
					description: "URL da imagem de perfil (opcional)",
					nullable: true,
				},
				callbackURL: {
					type: "string",
					description: "URL para redirecionar após cadastro (opcional)",
				},
			},
		},
		response: {
			200: {
				type: "object",
				description: "Conta criada com sucesso",
				properties: {
					user: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							email: { type: "string" },
							emailVerified: { type: "boolean" },
							image: { type: "string", nullable: true },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
						},
					},
					session: {
						type: "object",
						properties: {
							id: { type: "string" },
							expiresAt: { type: "string" },
							token: { type: "string" },
							ipAddress: { type: "string", nullable: true },
							userAgent: { type: "string", nullable: true },
						},
					},
				},
			},
			400: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
			409: {
				type: "object",
				properties: {
					error: { type: "string" },
					message: { type: "string" },
				},
			},
		},
	},
	handler: async (request: FastifyRequest, reply: FastifyReply) => {
		await authenticationRoute(request, reply);
	},
});

// Rota catch-all para outras rotas do Better Auth
// Deve ser definida por último para não interceptar as rotas específicas acima
app.route({
	method: ["GET", "POST", "PUT", "DELETE"],
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
	console.log("Swagger documentation available at http://localhost:3333/docs");
});
