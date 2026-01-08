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
	}),

	emailAndPassword: {
		enabled: true,
	},
	user: {
		modelName: "usuarios",
	},
	session: {
		modelName: "sessoes",
		expiresIn: 60 * 60 * 24 * 7, // 7 dias
		updateAge: 60 * 60 * 24, // 1 dia
	},
	account: {
		modelName: "contas",
	},
	verification: {
		modelName: "verificacoes",
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
			const roles = await db
				.select({
					role: schema.usuarios.role,
				})
				.from(schema.usuarios)
				.where(eq(schema.usuarios.id, user.id))
				.limit(1);

			return {
				user: {
					...user,
					roles: roles.map((role) => role.role),
				},
				session,
			};
		}),
	],
});
