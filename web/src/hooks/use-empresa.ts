"use client";

import { useCallback, useEffect, useState } from "react";
import { empresasService } from "@/services/empresas.service";

interface Empresa {
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

export function useEmpresa() {
	const EMPRESA_SELECIONADA_KEY = "empresa:mais-gestao";
	const [empresa, setEmpresa] = useState<Empresa | null>(null);

	// Ler localStorage apenas após montagem no cliente para evitar hydration mismatch
	useEffect(() => {
		if (typeof window === "undefined") return;

		try {
			const stored = localStorage.getItem(EMPRESA_SELECIONADA_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored);
			if (parsed && typeof parsed === "object" && parsed.id) {
				setEmpresa(parsed);
			}
		} catch {
			localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
		}
	}, []);

	async function listarEmpresas(params: {
		idusuario?: string;
		idproprietario?: string;
		page?: number;
		limit?: number;
	}) {
		const { idusuario, idproprietario, page, limit } = params;

		const { data } = await empresasService.listar({
			idusuario,
			idproprietario,
			page,
			limit,
		});

		return data;
	}

	const selecionarEmpresa = useCallback((empresa: Empresa) => {
		localStorage.setItem(EMPRESA_SELECIONADA_KEY, JSON.stringify(empresa));
		setEmpresa(empresa);
	}, []);

	function createCompany(data: CriarEmpresa) {
		return empresasService.criar(data);
	}

	function clearEmpresa() {
		localStorage.removeItem(EMPRESA_SELECIONADA_KEY);
		setEmpresa(null);
	}

	useEffect(() => {
		if (empresa) {
			localStorage.setItem(EMPRESA_SELECIONADA_KEY, JSON.stringify(empresa));
		}
	}, [empresa]);

	return {
		createCompany,
		listarEmpresas,
		selecionarEmpresa,
		clearEmpresa,
		localStorageEmpresa: empresa,
	};
}
