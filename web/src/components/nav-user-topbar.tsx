"use client";

import {
	IconCreditCard,
	IconLogout,
	IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
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

export function NavUserTopbar({ user }: NavUserTopbarProps) {
	const { logout } = useAuth();

	return (
		<div className="flex shrink-0 items-center gap-1 sm:gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className={cn(
							"rounded-md px-2 py-1 text-right text-sm leading-tight transition-colors",
							"hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30",
						)}
						aria-label="Menu do usuário"
					>
						<div className="truncate font-medium max-w-[120px] sm:max-w-[140px]">
							{user?.nome ?? <Skeleton className="ml-auto h-4 w-24" />}
						</div>
						<div className="truncate text-xs opacity-80">
							{user ? (
								formatarPerfilLabel(user.perfil)
							) : (
								<Skeleton className="ml-auto h-3 w-20" />
							)}
						</div>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-48 rounded-lg">
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
				</DropdownMenuContent>
			</DropdownMenu>

			<Button
				variant="ghost"
				size="icon"
				onClick={logout}
				className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
				title="Sair da conta"
			>
				<IconLogout className="size-4" />
				<span className="sr-only">Sair da conta</span>
			</Button>
		</div>
	);
}
