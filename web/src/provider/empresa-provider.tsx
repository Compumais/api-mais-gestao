"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { empresasService } from "@/services/empresas.service";

export interface Empresa {
	id: string;
	idproprietario: string;
	nome: string;
	email: string;
	endereco: string;
}

interface CriarEmpresa {
	nome: string;
	cnpj: string;
	email: string;
	telefone: string;
	endereco: string;
	idproprietario: string;
}

interface EmpresaContextData {
	empresa: Empresa | null;
	localStorageEmpresa: Empresa | null;
	selecionarEmpresa: (empresa: Empresa) => void;
	clearEmpresa: () => void;
	listarEmpresas: (params: {
		idusuario?: string;
		idproprietario?: string;
		page?: number;
		limit?: number;
	}) => Promise<Empresa[]>;
	createCompany: (data: CriarEmpresa) => ReturnType<typeof empresasService.criar>;
}

const EmpresaContext = createContext<EmpresaContextData | null>(null);

const EMPRESA_SELECIONADA_KEY = "empresa:mais-gestao";

function lerEmpresaStorage(): Empresa | null {
	if (typeof window === "undefined") return null;

	try {
		const stored = localStorage.getItem(EMPRESA_SELECIONADA_KEY);
		if (!stored) return null;

		const parsed = JSON.parse(stored) as Empresa;
		if (parsed && typeof parsed === "object" && parsed.id) {
			return parsed;
		}
	} catch {
		localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
	}

	return null;
}

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
	const [empresa, setEmpresa] = useState<Empresa | null>(null);

	useEffect(() => {
		setEmpresa(lerEmpresaStorage());
	}, []);

	useEffect(() => {
		const sincronizarEmpresa = () => {
			setEmpresa(lerEmpresaStorage());
		};

		window.addEventListener("storage", sincronizarEmpresa);
		return () => window.removeEventListener("storage", sincronizarEmpresa);
	}, []);

	const selecionarEmpresa = useCallback((novaEmpresa: Empresa) => {
		localStorage.setItem(EMPRESA_SELECIONADA_KEY, JSON.stringify(novaEmpresa));
		setEmpresa(novaEmpresa);
	}, []);

	const clearEmpresa = useCallback(() => {
		localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
		setEmpresa(null);
	}, []);

	const listarEmpresas = useCallback(
		async (params: {
			idusuario?: string;
			idproprietario?: string;
			page?: number;
			limit?: number;
		}) => {
			const { data } = await empresasService.listar(params);
			return data;
		},
		[],
	);

	const createCompany = useCallback((data: CriarEmpresa) => {
		return empresasService.criar(data);
	}, []);

	return (
		<EmpresaContext.Provider
			value={{
				empresa,
				localStorageEmpresa: empresa,
				selecionarEmpresa,
				clearEmpresa,
				listarEmpresas,
				createCompany,
			}}
		>
			{children}
		</EmpresaContext.Provider>
	);
}

export function useEmpresa() {
	const context = useContext(EmpresaContext);

	if (!context) {
		throw new Error("useEmpresa deve ser usado dentro do EmpresaProvider");
	}

	return context;
}
