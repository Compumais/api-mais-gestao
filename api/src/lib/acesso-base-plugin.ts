import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import {
	deleteSessionCookie,
	expireCookie,
	setSessionCookie,
} from "better-auth/cookies";
import * as z from "zod";
import { buscarUsuarioPorId } from "@/repositories/usuarios-repositories.js";
import { resolverAdministradorBase } from "@/service/admin/resolver-administrador-base.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

const DURACAO_ACESSO_BASE_MS = 8 * 60 * 60 * 1000;
const COOKIE_RETORNO_SUPER = "acesso_base_super";

type SessaoAuth = {
	user: { id: string; email: string; name: string };
	session: { token: string };
};

function sessaoDoContexto(contexto: { session?: SessaoAuth }): SessaoAuth {
	if (!contexto.session?.user?.id || !contexto.session.session?.token) {
		throw APIError.fromStatus("UNAUTHORIZED", { message: "Não autorizado" });
	}
	return contexto.session;
}

export function acessoBasePlugin(): BetterAuthPlugin {
	return {
		id: "acesso-base",
		endpoints: {
			acessarBase: createAuthEndpoint(
				"/acesso-base",
				{
					method: "POST",
					body: z.object({
						idempresa: z.string().min(1),
					}),
					use: [sessionMiddleware],
				},
				async (ctx) => {
					const sessaoAtual = sessaoDoContexto(ctx.context);
					const autor = await buscarUsuarioPorId(sessaoAtual.user.id);
					const perfilAutor = normalizarPerfilArray(autor?.perfil);
					if (!perfilAutor.includes("super")) {
						throw APIError.fromStatus("FORBIDDEN", {
							message: "Acesso restrito a super administradores",
						});
					}

					const { empresa, administrador } = await resolverAdministradorBase(
						ctx.body.idempresa,
					);
					if (!empresa) {
						throw APIError.fromStatus("NOT_FOUND", {
							message: "Empresa não encontrada",
						});
					}
					if (!administrador) {
						throw APIError.fromStatus("BAD_REQUEST", {
							message:
								"Esta empresa não tem um usuário administrador para acessar a base.",
						});
					}

					const usuarioAuth =
						await ctx.context.internalAdapter.findUserById(administrador.id);
					if (!usuarioAuth) {
						throw APIError.fromStatus("NOT_FOUND", {
							message: "Usuário administrador não encontrado",
						});
					}

					const session = await ctx.context.internalAdapter.createSession(
						administrador.id,
						false,
						{ expiresAt: new Date(Date.now() + DURACAO_ACESSO_BASE_MS) },
						true,
					);
					if (!session) {
						throw APIError.fromStatus("INTERNAL_SERVER_ERROR", {
							message: "Não foi possível abrir a base da empresa",
						});
					}

					const cookieRetorno = ctx.context.createAuthCookie(
						COOKIE_RETORNO_SUPER,
					);
					await ctx.setSignedCookie(
						cookieRetorno.name,
						sessaoAtual.session.token,
						ctx.context.secret,
						{
							...ctx.context.authCookies.sessionToken.attributes,
							maxAge: DURACAO_ACESSO_BASE_MS / 1000,
						},
					);
					deleteSessionCookie(ctx);
					await setSessionCookie(
						ctx,
						{ session, user: usuarioAuth },
						false,
					);

					return ctx.json({
						token: session.token,
						usuario: {
							id: administrador.id,
							nome: administrador.nome,
							email: administrador.email,
							perfil: normalizarPerfilArray(administrador.perfil),
						},
						empresa: {
							id: empresa.id,
							idproprietario: empresa.idproprietario,
							nome: empresa.nome,
							cnpj: empresa.cnpj,
							telefone: empresa.telefone,
							email: empresa.email,
							endereco: empresa.endereco,
							numero: empresa.numero,
							complemento: empresa.complemento,
							bairro: empresa.bairro,
							cep: empresa.cep,
							idestado: empresa.idestado,
							idcidade: empresa.idcidade,
						},
					});
				},
			),
			encerrarAcessoBase: createAuthEndpoint(
				"/encerrar-acesso-base",
				{
					method: "POST",
					use: [sessionMiddleware],
				},
				async (ctx) => {
					const sessaoAtual = sessaoDoContexto(ctx.context);
					const cookieRetorno = ctx.context.createAuthCookie(
						COOKIE_RETORNO_SUPER,
					);
					const tokenSuper = await ctx.getSignedCookie(
						cookieRetorno.name,
						ctx.context.secret,
					);
					if (!tokenSuper) {
						throw APIError.fromStatus("BAD_REQUEST", {
							message: "Não há um retorno ao super nesta sessão",
						});
					}

					const sessaoSuper =
						await ctx.context.internalAdapter.findSession(tokenSuper);
					if (!sessaoSuper?.session || !sessaoSuper.user) {
						expireCookie(ctx, cookieRetorno);
						throw APIError.fromStatus("BAD_REQUEST", {
							message:
								"A sessão de super expirou. Entre novamente no painel.",
						});
					}

					const superUsuario = await buscarUsuarioPorId(sessaoSuper.user.id);
					if (!normalizarPerfilArray(superUsuario?.perfil).includes("super")) {
						expireCookie(ctx, cookieRetorno);
						throw APIError.fromStatus("FORBIDDEN", {
							message: "O retorno não aponta para um super administrador",
						});
					}

					await ctx.context.internalAdapter.deleteSession(
						sessaoAtual.session.token,
					);
					await setSessionCookie(ctx, sessaoSuper, false);
					expireCookie(ctx, cookieRetorno);

					return ctx.json({ token: sessaoSuper.session.token });
				},
			),
			descartarAcessoBase: createAuthEndpoint(
				"/descartar-acesso-base",
				{
					method: "POST",
					requireHeaders: true,
				},
				async (ctx) => {
					const cookieRetorno = ctx.context.createAuthCookie(
						COOKIE_RETORNO_SUPER,
					);
					expireCookie(ctx, cookieRetorno);
					return ctx.json({ ok: true });
				},
			),
		},
	};
}
