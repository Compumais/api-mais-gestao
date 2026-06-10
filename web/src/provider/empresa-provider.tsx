"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface Empresa {
	id: string;
	idproprietario: string;
	nome: string;
	email: string;
	endereco: string;
}

interface EmpresaContextData {
	empresa: Empresa | null;
	selecionarEmpresa: (empresa: Empresa) => void;
	clearEmpresa: () => void;
}

const EmpresaContext = createContext<EmpresaContextData | null>(null);

const EMPRESA_SELECIONADA_KEY = "empresa:mais-gestao";

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
	const [empresa, setEmpresa] = useState<Empresa | null>(null);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(EMPRESA_SELECIONADA_KEY);
			if (stored) setEmpresa(JSON.parse(stored));
		} catch {
			localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
		}
	}, []);

	function selecionarEmpresa(empresa: Empresa) {
		localStorage.setItem(EMPRESA_SELECIONADA_KEY, JSON.stringify(empresa));
		setEmpresa(empresa);
	}

	function clearEmpresa() {
		localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
		setEmpresa(null);
	}

	return (
		<EmpresaContext.Provider
			value={{ empresa, selecionarEmpresa, clearEmpresa }}
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
