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
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(
	(config) => {
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("token:mais-gestao");
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Se receber 401, remover o token e redirecionar para login
		// Mas só se não estiver já na página de login
		if (error.response?.status === 401) {
			if (typeof window !== "undefined") {
				const currentPath = window.location.pathname;
				if (currentPath !== "/entrar") {
					localStorage.removeItem("token:mais-gestao");
					window.location.href = "/entrar";
				}
			}
		}
		const message =
			error.response?.data?.message ||
			error.response?.data?.error ||
			error.message ||
			"Erro ao realizar a requisição";
		return Promise.reject(new Error(message));
	},
);
