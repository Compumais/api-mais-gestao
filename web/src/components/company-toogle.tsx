"use client";

import { Building2Icon, CheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useEmpresa } from "@/hooks/use-empresa";
import { useEmpresasUsuario } from "@/hooks/use-empresas-usuario";
import { useEntitlements } from "@/hooks/use-plano";
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
	const { data: empresas, isSuccess: empresasCarregadas } =
		useEmpresasUsuario();
	const { limites, isLoading: isLoadingEntitlements } = useEntitlements();

	const nomeEmpresa =
		localStorageEmpresa?.nome ||
		(!empresasCarregadas ? "Carregando..." : "Selecionar uma empresa");
	const limiteEmpresasAtingido =
		!isLoadingEntitlements &&
		limites.maxempresas > 0 &&
		(empresas?.length ?? 0) >= limites.maxempresas;

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
						aria-disabled={limiteEmpresasAtingido}
						className="border-2 border-transparent hover:border-2 hover:border-dashed hover:border-border aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
						href="/empresas/nova"
						onClick={(event) => {
							if (!limiteEmpresasAtingido) return;
							event.preventDefault();
							toast.error(
								"Limite de empresas atingido. Faça upgrade do plano para adicionar outra empresa.",
							);
						}}
					>
						<PlusIcon className="size-4" />
						<span>Adicionar empresa</span>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
