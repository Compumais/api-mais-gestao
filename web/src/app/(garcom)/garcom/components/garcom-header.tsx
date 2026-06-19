"use client";

import Link from "next/link";
import { IconArrowLeft, IconLogout } from "@tabler/icons-react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { getDefaultRouteForUser } from "@/lib/perfis";

interface GarcomHeaderProps {
	titulo?: string;
	voltarHref?: string;
	voltarLabel?: string;
}

export function GarcomHeader({
	titulo = "Garçom",
	voltarHref,
	voltarLabel = "Voltar",
}: GarcomHeaderProps) {
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { user, logout } = useAuth();
	const homeHref = getDefaultRouteForUser(user);

	return (
		<header className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4">
			<div className="flex min-w-0 items-center gap-2">
				<Link
					href={homeHref}
					className="flex shrink-0 items-center gap-1.5 text-primary"
				>
					<CPlusIcon size={24} />
				</Link>
				<div className="min-w-0">
					<h1 className="truncate text-sm font-semibold sm:text-base">{titulo}</h1>
					{empresa && (
						<p className="truncate text-xs text-muted-foreground">
							{empresa.nome}
						</p>
					)}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				{voltarHref && (
					<Button variant="outline" size="sm" asChild>
						<Link href={voltarHref}>
							<IconArrowLeft className="size-4" />
							<span className="hidden sm:inline">{voltarLabel}</span>
						</Link>
					</Button>
				)}
				<Button
					variant="ghost"
					size="sm"
					className="gap-1.5"
					onClick={() => logout()}
					aria-label="Sair do sistema"
				>
					<IconLogout className="size-4" />
					<span className="hidden sm:inline">Sair</span>
				</Button>
			</div>
		</header>
	);
}
