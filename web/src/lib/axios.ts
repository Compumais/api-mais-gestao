import axios from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
	throw new Error(
		"NEXT_PUBLIC_API_URL não está definida nas variáveis de ambiente. Configure a variável no arquivo .env.local",
	);
}

export const api = axios.create({
	baseURL: apiUrl,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Necessário para enviar cookies do Better Auth
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
	(response) => response,
	(error) => {
		const data = error.response?.data;
		const message =
			(typeof data?.message === "string" && data.message) ||
			(Array.isArray(data?.details) &&
				data.details
					.map((item: { message?: string; path?: string[] }) =>
						item.path?.length
							? `${item.path.join(".")}: ${item.message ?? "inválido"}`
							: item.message,
					)
					.filter(Boolean)
					.join("; ")) ||
			data?.error ||
			error.message ||
			"Erro ao realizar a requisição";
		return Promise.reject(new Error(message));
	},
);
