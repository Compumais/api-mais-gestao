import type { FastifyReply, FastifyRequest } from "fastify";
import { app } from "../index.js";
import { auth } from "../services/auth.js";

export async function authenticationRoute(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const url = new URL(request.url, `http://${request.headers.host}`);

		const headers = new Headers();
		Object.entries(request.headers).forEach(([key, value]) => {
			if (value) headers.append(key, value.toString());
		});
		const req = new Request(url.toString(), {
			method: request.method as string,
			headers,
			body: request.body ? JSON.stringify(request.body) : null,
		});
		// Process authentication request
		const response = await auth.handler(req);
		// Forward response to client
		reply.status(response.status);
		response.headers.forEach((value: string, key: string) => {
			reply.header(key, value);
		});
		reply.send(response.body ? await response.text() : null);
	} catch (error) {
		app.log.error(error, "Authentication Error");
		reply.status(500).send({
			error: "Internal authentication error",
			code: "AUTH_FAILURE",
		});
	}
}
