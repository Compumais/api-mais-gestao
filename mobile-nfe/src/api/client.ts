import axios, { type AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { HEADER_EMPRESA_ID, STORAGE_API_URL, STORAGE_EMPRESA } from "@/src/constants/storage";

const TOKEN_KEY = "mg-session-token";

let memoryToken: string | null = null;
let memoryApiUrl: string | null = null;
let memoryEmpresaId: string | null = null;

export async function getApiUrl(): Promise<string> {
	if (memoryApiUrl) return memoryApiUrl;
	const stored = await AsyncStorage.getItem(STORAGE_API_URL);
	const url =
		stored?.trim() || process.env.EXPO_PUBLIC_API_URL?.trim() || "";
	memoryApiUrl = url;
	return url;
}

export async function setApiUrl(url: string): Promise<void> {
	const normalized = url.trim().replace(/\/+$/, "");
	memoryApiUrl = normalized;
	await AsyncStorage.setItem(STORAGE_API_URL, normalized);
}

export async function getSessionToken(): Promise<string | null> {
	if (memoryToken) return memoryToken;
	memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
	return memoryToken;
}

export async function setSessionToken(token: string | null): Promise<void> {
	memoryToken = token;
	if (token) {
		await SecureStore.setItemAsync(TOKEN_KEY, token);
	} else {
		await SecureStore.deleteItemAsync(TOKEN_KEY);
	}
}

export async function getEmpresaId(): Promise<string | null> {
	if (memoryEmpresaId) return memoryEmpresaId;
	const raw = await AsyncStorage.getItem(STORAGE_EMPRESA);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as { id?: string };
		memoryEmpresaId = parsed.id ?? null;
		return memoryEmpresaId;
	} catch {
		return null;
	}
}

export async function setEmpresaSelecionada(empresa: {
	id: string;
	nome: string;
}): Promise<void> {
	memoryEmpresaId = empresa.id;
	await AsyncStorage.setItem(STORAGE_EMPRESA, JSON.stringify(empresa));
}

export async function clearEmpresaSelecionada(): Promise<void> {
	memoryEmpresaId = null;
	await AsyncStorage.removeItem(STORAGE_EMPRESA);
}

export const api = axios.create({
	timeout: 60_000,
	headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
	const baseURL = await getApiUrl();
	if (baseURL) {
		config.baseURL = baseURL;
	}
	const token = await getSessionToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	const idempresa = await getEmpresaId();
	if (idempresa) {
		config.headers[HEADER_EMPRESA_ID] = idempresa;
	}
	return config;
});

export function extrairErroApi(error: unknown): string {
	if (axios.isAxiosError(error)) {
		const ax = error as AxiosError<{ error?: string; message?: string }>;
		const data = ax.response?.data;
		if (data?.error) return data.error;
		if (data?.message) return data.message;
		if (ax.message) return ax.message;
	}
	if (error instanceof Error) return error.message;
	return "Erro desconhecido";
}
