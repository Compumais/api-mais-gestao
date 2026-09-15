"use client";

import { useQuery } from "@tanstack/react-query";
import { useEmpresa } from "@/hooks/use-empresa";
import { hierarquiasService } from "@/services/hierarquias.service";
import { usuariosService } from "@/services/usuarios.service";

export type OpcaoFiltroDashboard = {
	id: string;
	nome: string;
};

function ordenarPorNome(itens: OpcaoFiltroDashboard[]) {
	return [...itens].sort((a, b) =>
		a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
	);
}

export function useDashboardFiltroOpcoes() {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const idempresa = empresa?.id;

	const vendedoresQuery = useQuery({
		queryKey: ["dashboard", "filtro-vendedores", idempresa],
		queryFn: async () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			const usuarios = await usuariosService.listarTodos({ idempresa });
			return ordenarPorNome(
				usuarios.map((usuario) => ({
					id: usuario.id,
					nome: usuario.nome,
				})),
			);
		},
		enabled: !!idempresa,
	});

	const categoriasQuery = useQuery({
		queryKey: ["dashboard", "filtro-categorias", idempresa],
		queryFn: async () => {
			if (!idempresa) throw new Error("Empresa não selecionada");
			const grupos = await hierarquiasService.listarTodos({ idempresa });
			return ordenarPorNome(
				grupos.map((grupo) => ({
					id: grupo.id,
					nome: grupo.nome?.trim() || grupo.codigo?.trim() || "Sem nome",
				})),
			);
		},
		enabled: !!idempresa,
	});

	return {
		vendedores: vendedoresQuery.data ?? [],
		categorias: categoriasQuery.data ?? [],
		carregandoOpcoes: vendedoresQuery.isLoading || categoriasQuery.isLoading,
	};
}
