"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2Icon, CheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEmpresasUsuario } from "@/hooks/use-empresas-usuario";
import { useEmpresa } from "@/hooks/use-empresa";
import { getMeuPlano } from "@/services/assinaturas.service";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function maxEmpresasPorPlano(plano: string) {
	switch (plano) {
		case "BASIC":
			return 1;
		case "PREMIUM":
			return 2;
		case "ENTERPRISE":
			return 5;
		default:
			return 0;
	}
}

export function CompanyToogle() {
	const { localStorageEmpresa, selecionarEmpresa } = useEmpresa();
	const { data: empresas, isSuccess: empresasCarregadas } = useEmpresasUsuario();

	const { data: assinatura } = useQuery({
		queryKey: ["meu-plano", localStorageEmpresa?.id],
		queryFn: async () => {
			if (!localStorageEmpresa?.id) {
				return null;
			}
			return await getMeuPlano(localStorageEmpresa.id);
		},
		enabled: !!localStorageEmpresa?.id,
		staleTime: 1000 * 60 * 30,
		retry: false,
	});

	const nomeEmpresa =
		localStorageEmpresa?.nome ||
		(!empresasCarregadas ? "Carregando..." : "Selecionar uma empresa");

	const isPlanoBasico =
		assinatura === null ||
		(assinatura?.plan ? maxEmpresasPorPlano(assinatura.plan) === 1 : false);
	const temApenasUmaEmpresa = empresas && empresas.length === 1;

	if (isPlanoBasico && temApenasUmaEmpresa) {
		return (
			<Button variant="secondary" size="sm" className="hidden sm:flex">
				<Building2Icon className="size-4" />
				<span>{nomeEmpresa}</span>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary" size="sm" className="hidden sm:flex">
					<Building2Icon className="size-4" />
					<span>{nomeEmpresa}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Selecione uma empresa</DropdownMenuLabel>
				{empresas?.map((empresaItem) => (
					<DropdownMenuItem
						key={empresaItem.id}
						onClick={() => selecionarEmpresa(empresaItem)}
					>
						{empresaItem.nome}
						{empresaItem.id === localStorageEmpresa?.id && (
							<CheckIcon className="size-4" />
						)}
					</DropdownMenuItem>
				))}

				{assinatura?.plan &&
					empresas &&
					maxEmpresasPorPlano(assinatura.plan) > empresas.length && (
						<>
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
						</>
					)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
