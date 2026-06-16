"use client";

import Link from "next/link";
import { IconArrowLeft, IconLogout } from "@tabler/icons-react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";

interface PdvHeaderProps {
	titulo?: string;
	voltarHref?: string;
	voltarLabel?: string;
}

export function PdvHeader({
	titulo = "PDV Gourmet",
	voltarHref = "/gourmet",
	voltarLabel = "Mesas",
}: PdvHeaderProps) {
	const { logout } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();

	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
			<div className="flex items-center gap-3">
				<Link href="/dashboard" className="flex items-center gap-2 text-primary">
					<CPlusIcon size={28} />
					<span className="hidden font-semibold sm:inline">Mais Gestão</span>
				</Link>
				<span className="text-muted-foreground">/</span>
				<h1 className="text-sm font-semibold sm:text-base">{titulo}</h1>
				{empresa && (
					<span className="hidden text-sm text-muted-foreground md:inline">
						— {empresa.nome}
					</span>
				)}
			</div>
			<div className="flex items-center gap-2">
				<Button variant="outline" size="sm" asChild>
					<Link href={voltarHref}>
						<IconArrowLeft className="size-4" />
						<span className="hidden sm:inline">{voltarLabel}</span>
					</Link>
				</Button>
				<Button variant="ghost" size="sm" asChild>
					<Link href="/dashboard">Voltar ao sistema</Link>
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => logout()}
					aria-label="Sair"
				>
					<IconLogout className="size-4" />
				</Button>
			</div>
		</header>
	);
}
