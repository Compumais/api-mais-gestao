"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2Icon, CheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Empresa {
	id: string;
	idproprietario: string;
	nome: string;
}

export function CompanyToogle() {
	const { listarEmpresas, localStorageEmpresa, selecionarEmpresa } =
		useEmpresa();
	const { user } = useAuth();
	const queryClient = useQueryClient();

	const [empresa, setEmpresa] = useState<Empresa | null>(null);

	const { data: empresas } = useQuery({
		queryKey: ["empresas", user?.id],
		// Buscar empresas onde o usuário é proprietário OU está associado na tabela usuario_empresa
		queryFn: () =>
			listarEmpresas({ idusuario: user?.id, idproprietario: user?.id }),
	});

	useEffect(() => {
		if (empresas && empresas.length > 0) {
			// Verifica se a empresa atual ainda existe na lista
			const empresaAtualExiste = empresa
				? empresas.some((e) => e.id === empresa.id)
				: false;

			// Se a empresa atual não existe mais na lista ou não há empresa definida
			if (!empresaAtualExiste) {
				// Verifica se a empresa do localStorage existe na lista de empresas
				const empresaLocalStorage = localStorageEmpresa
					? empresas.find((e) => e.id === localStorageEmpresa.id)
					: null;

				if (empresaLocalStorage) {
					// Se a empresa do localStorage existe na lista, usa ela
					setEmpresa(empresaLocalStorage);
					// Garante que está salva no localStorage
					selecionarEmpresa(empresaLocalStorage);
				} else {
					// Se não existe, usa a primeira empresa da lista
					const primeiraEmpresa = empresas[0];
					setEmpresa(primeiraEmpresa);
					selecionarEmpresa(primeiraEmpresa);
				}
			}
		}
	}, [empresas, localStorageEmpresa, selecionarEmpresa, empresa]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="secondary" size="sm" className="hidden sm:flex">
					<Building2Icon className="size-4" />
					<span>{empresa?.nome || "Selecionar uma empresa"}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Selecione uma empresa</DropdownMenuLabel>
				{empresas?.map((empresaItem) => (
					<DropdownMenuItem
						key={empresaItem.id}
						onClick={() => {
							selecionarEmpresa(empresaItem);
							setEmpresa(empresaItem);
						}}
					>
						{empresaItem.nome}
						{empresaItem.id === empresa?.id && <CheckIcon className="size-4" />}
					</DropdownMenuItem>
				))}

				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						className="border-2 border-transparent hover:border-2 hover:border-dashed hover:border-border"
						href="/empresas/nova"
					>
						<PlusIcon className="size-4" />
						<span>Adicionar empresa</span>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
