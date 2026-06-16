import { type Auth, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import * as schema from "../../drizzle/schema.js";
import { db } from "../repositories/connection.js";
import { getApiBaseUrl } from "../util/base-url.js";
import { getClientOrigins, getPrimaryClientOrigin } from "../util/cors-origins.js";

export const auth = betterAuth({
	baseURL: getApiBaseUrl(),
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
	databaseHooks: {
		user: {
			create: {
				before: async (user, _context) => {
					return {
						data: {
							...user,
							perfil: ["proprietario"],
						},
					};
				},
			},
		},
	},

	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
	trustedOrigins: getClientOrigins(),
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
			plano: {
				type: "string",
				required: false,
				input: false,
			},
			plano_inicio_ciclo: {
				type: "date",
				required: false,
				input: false,
			},
			plano_fim_ciclo: {
				type: "date",
				required: false,
				input: false,
			},
			plano_proximo: {
				type: "string",
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
		useSecureCookies: getPrimaryClientOrigin().startsWith("https://"),
		cookiePrefix: "mais-gestao",
		appName: "Mais Gestão",
		appDescription: "Mais Gestão é um sistema de gestão de empresas",
		appUrl: getPrimaryClientOrigin(),
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
					plano: schema.usuarios.plano,
				})
				.from(schema.usuarios)
				.where(eq(schema.usuarios.id, user.id))
				.limit(1);

			const perfilRaw: unknown = dadosUsuario[0]?.perfil;
			let perfil: string[] = ["usuario"];

			if (perfilRaw) {
				if (Array.isArray(perfilRaw)) {
					perfil = perfilRaw.filter((p): p is string => typeof p === "string");
				} else if (typeof perfilRaw === "string") {
					perfil = [perfilRaw];
				}
			}

			return {
				user: {
					...user,
					perfil,
					plano: dadosUsuario[0]?.plano || null,
				},
				session,
			};
		}),
	],
}) as unknown as Auth;
