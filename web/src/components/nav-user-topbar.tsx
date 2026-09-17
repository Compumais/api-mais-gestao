"use client";

import {
	IconCreditCard,
	IconLogout,
	IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { formatarPerfilLabel } from "@/lib/perfis";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

interface NavUserTopbarProps {
	user: {
		nome: string;
		email: string;
		perfil?: string | string[];
	} | null;
}

function iniciaisDoNome(nome: string): string {
	const partes = nome.trim().split(/\s+/).filter(Boolean);
	if (partes.length === 0) return "?";
	const primeira = partes[0]?.[0] ?? "";
	if (partes.length === 1) return primeira.toUpperCase();
	const ultima = partes[partes.length - 1]?.[0] ?? "";
	return `${primeira}${ultima}`.toUpperCase();
}

export function NavUserTopbar({ user }: NavUserTopbarProps) {
	const { logout } = useAuth();

	if (!user) {
		return <Skeleton className="size-8 rounded-full" />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex size-8 items-center justify-center rounded-full text-xs font-semibold tracking-wide",
						"bg-primary-foreground/15 text-primary-foreground",
						"transition-colors hover:bg-primary-foreground/25",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40",
					)}
					aria-label="Menu do usuário"
				>
					{iniciaisDoNome(user.nome)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56 rounded-lg">
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="grid gap-0.5 px-2 py-1.5 text-left text-sm leading-tight">
						<span className="truncate font-medium text-foreground">
							{user.nome}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{formatarPerfilLabel(user.perfil)}
						</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/minha-conta">
							<IconUserCircle />
							Minha conta
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/meus-planos">
							<IconCreditCard />
							Meus planos
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={logout}>
					<IconLogout />
					Sair da conta
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
