import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_API_URL,
	fetchOptions: {
		credentials: "include", // Necessário para enviar cookies em requisições cross-origin
	},
});

export const { signIn, signUp, useSession } = authClient;
