import type { FastifyReply, FastifyRequest } from "fastify";
/**
 * Middleware para verificar autenticação usando Better Auth
 * Aceita tanto cookies (padrão do Better Auth) quanto tokens JWT no header Authorization
 */
export declare function verifyJwt(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
//# sourceMappingURL=verify-jwt.d.ts.map