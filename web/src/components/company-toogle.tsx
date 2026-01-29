import { Building2Icon, CheckIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
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
	const { empresas, selecionarEmpresa, empresa } = useEmpresa();

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
				{empresas.map((empresaItem) => (
					<DropdownMenuItem
						key={empresaItem.id}
						onClick={() => selecionarEmpresa(empresaItem.id)}
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
