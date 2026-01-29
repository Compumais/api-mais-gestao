import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "../repositories/connection.js";

export const auth = betterAuth({
	baseURL:
		process.env.BETTER_AUTH_URL ||
		process.env.API_URL ||
		"http://localhost:3333",
	basePath: "/api/auth",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			...schema,
			user: schema.usuarios,
			session: schema.sessoes,
			account: schema.contas,
			verification: schema.verificacoes,
		},
	}),

	emailAndPassword: {
		enabled: true,
	},
	user: {
		modelName: "usuarios",
		fields: {
			name: "nome",
			emailVerified: "emailverificado",
			image: "imagem",
			createdAt: "criadoem",
			updatedAt: "atualizadoem",
		},
		additionalFields: {
			maxempresas: {
				type: "number",
				required: false,
				input: false,
			},
		},
	},
	session: {
		modelName: "sessoes",
		expiresIn: 60 * 60 * 24 * 7, // 7 dias
		updateAge: 60 * 60 * 24, // 1 dia
		fields: {
			userId: "idusuario",
			createdAt: "criadoem",
			updatedAt: "atualizadoem",
			expiresAt: "expiraem",
			userAgent: "useragent",
			ipAddress: "enderecoip",
			token: "token",
		},
	},
	account: {
		modelName: "contas",
		fields: {
			userId: "idusuario",
			accountId: "idconta",
			providerId: "idprovedor",
			createdAt: "criadoem",
			updatedAt: "atualizadoem",
			accessToken: "acessotoken",
			refreshToken: "refreshtoken",
			idToken: "idtoken",
			accessTokenExpiresAt: "acessotokenexpiraem",
			refreshTokenExpiresAt: "refreshtokenexpiraem",
			scope: "escopo",
		},
	},
	verification: {
		modelName: "verificacoes",
		fields: {
			identifier: "identificador",
			value: "valor",
			expiresAt: "expiraem",
			createdAt: "criadoem",
			updatedAt: "atualizadoem",
		},
	},
	advanced: {
		disableOriginCheck: true,
		appName: "Mais Gestão",
		appDescription: "Mais Gestão é um sistema de gestão de empresas",
		appUrl: "https://maisgestao.com",
		appIcon: "https://maisgestao.com/icon.png",
		appColor: "#000000",
		appTheme: "dark",
		appLanguage: "pt-BR",
		appLocale: "pt-BR",
		appTimezone: "America/Sao_Paulo",
	},
	plugins: [
		customSession(async ({ user, session }) => {
			const dadosUsuario = await db
				.select({
					perfil: schema.usuarios.perfil,
				})
				.from(schema.usuarios)
				.where(eq(schema.usuarios.id, user.id))
				.limit(1);

			const perfilRaw: unknown = dadosUsuario[0]?.perfil;
			let perfil = "usuario";

			if (perfilRaw) {
				if (Array.isArray(perfilRaw) && perfilRaw.length > 0) {
					const firstElement = perfilRaw[0];
					if (typeof firstElement === "string") {
						perfil = firstElement;
					}
				} else if (typeof perfilRaw === "string") {
					perfil = perfilRaw;
				}
			}

			return {
				user: {
					...user,
					perfil: perfil,
				},
				session,
			};
		}),
	],
});
