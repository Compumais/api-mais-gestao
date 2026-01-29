"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { empresasService } from "@/services/empresas.service";

interface CriarEmpresa {
	nome: string;
	cnpj: string;
	telefone: string;
	idproprietario: string;
}

const EMPRESA_SELECIONADA_KEY = "empresa:mais-gestao";
const EMPRESA_SELECIONADA_QUERY_KEY = ["empresa-selecionada"];

export function useEmpresa() {
	const queryClient = useQueryClient();

	const { data: empresas } = useQuery({
		queryKey: ["empresas"],
		queryFn: () => empresasService.listar(),
	});

	const { data: empresaSelecionadaId } = useQuery({
		queryKey: EMPRESA_SELECIONADA_QUERY_KEY,
		queryFn: () => {
			if (typeof window === "undefined") {
				return null;
			}
			return localStorage.getItem(EMPRESA_SELECIONADA_KEY);
		},
		staleTime: Infinity,
	});

	const selecionarEmpresa = (id: string) => {
		const novaEmpresa = empresas?.data.find((e) => e.id === id);
		if (novaEmpresa) {
			if (typeof window !== "undefined") {
				localStorage.setItem(EMPRESA_SELECIONADA_KEY, id);
			}
			queryClient.setQueryData(EMPRESA_SELECIONADA_QUERY_KEY, id);
			// Remove queries antigas - o React Query refaz automaticamente quando a query key muda
			queryClient.removeQueries({ queryKey: ["plano-contas"] });
		}
	};

	const { mutate: criarEmpresa } = useMutation({
		mutationFn: (data: CriarEmpresa) => empresasService.criar(data),
	});

	useEffect(() => {
		if (!empresas?.data || empresas.data.length === 0) {
			return;
		}

		const empresaValida = empresaSelecionadaId
			? empresas.data.find((e) => e.id === empresaSelecionadaId)
			: null;

		const empresaFallback = empresaValida ?? empresas.data[0];
		if (!empresaFallback) {
			return;
		}

		if (empresaFallback.id !== empresaSelecionadaId) {
			if (typeof window !== "undefined") {
				localStorage.setItem(EMPRESA_SELECIONADA_KEY, empresaFallback.id);
			}
			queryClient.setQueryData(
				EMPRESA_SELECIONADA_QUERY_KEY,
				empresaFallback.id,
			);
		}
	}, [empresas?.data, empresaSelecionadaId, queryClient]);

	const empresaAtual =
		empresas?.data.find((e) => e.id === empresaSelecionadaId) ??
		empresas?.data[0] ??
		null;

	return {
		empresa: empresaAtual,
		empresas: empresas?.data || [],
		selecionarEmpresa,
		criarEmpresa,
	};
}
