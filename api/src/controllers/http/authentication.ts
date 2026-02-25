import type { FastifyReply, FastifyRequest } from "fastify";
import { app } from "../../index.js";
import { auth } from "../../lib/auth.js";

export async function authenticationRoute(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const host = request.headers.host || "localhost:3333";
		const protocol = request.protocol || "http";
		const url = new URL(request.url, `${protocol}://${host}`);

		const headers = new Headers();
		for (const [key, value] of Object.entries(request.headers)) {
			if (Array.isArray(value)) {
				for (const v of value) {
					headers.append(key, v);
				}
			} else if (value) {
				headers.append(key, value as string);
			}
		}

		const req = new Request(url.toString(), {
			method: request.method,
			headers,
			body:
				request.method === "GET" || request.method === "HEAD"
					? null
					: request.body
						? JSON.stringify(request.body)
						: null,
		});

		// Process authentication request
		const response = await auth.handler(req);

		// Forward response to client
		reply.status(response.status);

		// Forward headers except Set-Cookie (handled below)
		response.headers.forEach((value: string, key: string) => {
			if (key.toLowerCase() !== "set-cookie") {
				reply.header(key, value);
			}
		});

		// Correctly handle multiple Set-Cookie headers to avoid concatenation
		// This is critical for state/session cookies in social logins
		const setCookies = response.headers.getSetCookie?.();
		if (setCookies && setCookies.length > 0) {
			reply.raw.setHeader("set-cookie", setCookies);
		}

		reply.send(response.body ? await response.text() : null);
	} catch (error) {
		app.log.error(error, "Authentication Error");
		reply.status(500).send({
			error: "Internal authentication error",
			code: "AUTH_FAILURE",
		});
	}
}
