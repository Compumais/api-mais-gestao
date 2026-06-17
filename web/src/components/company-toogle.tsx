"use client";

import { Building2Icon, CheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEmpresasUsuario } from "@/hooks/use-empresas-usuario";
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

export function CompanyToogle() {
	const { localStorageEmpresa, selecionarEmpresa } = useEmpresa();
	const { data: empresas, isSuccess: empresasCarregadas } = useEmpresasUsuario();

	const nomeEmpresa =
		localStorageEmpresa?.nome ||
		(!empresasCarregadas ? "Carregando..." : "Selecionar uma empresa");

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
