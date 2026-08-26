"use client";

import {
	IconCreditCard,
	IconDotsVertical,
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
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { formatarPerfilLabel } from "@/lib/perfis";
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
			<div className="hidden text-right text-sm leading-tight lg:block">
				<div className="truncate font-medium max-w-[140px]">
					{user?.nome ?? <Skeleton className="ml-auto h-4 w-24" />}
				</div>
				<div className="truncate text-xs opacity-80">
					{user ? (
						formatarPerfilLabel(user.perfil)
					) : (
						<Skeleton className="ml-auto h-3 w-20" />
					)}
				</div>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
					>
						<IconDotsVertical className="size-4" />
						<span className="sr-only">Menu do usuário</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-56 rounded-lg">
					<DropdownMenuLabel className="p-0 font-normal lg:hidden">
						<div className="px-2 py-1.5 text-sm">
							<div className="font-medium">{user?.nome}</div>
							<div className="text-muted-foreground text-xs">
								{user ? formatarPerfilLabel(user.perfil) : null}
							</div>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator className="lg:hidden" />
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
								Meus Planos
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

			<Button
				variant="ghost"
				size="icon"
				onClick={logout}
				className="hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:inline-flex"
				title="Sair da conta"
			>
				<IconLogout className="size-4" />
				<span className="sr-only">Sair da conta</span>
			</Button>
		</div>
	);
}
