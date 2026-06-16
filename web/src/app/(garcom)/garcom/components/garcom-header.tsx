"use client";

import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/hooks/use-empresa";

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

	return (
		<header className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4">
			<div className="flex min-w-0 items-center gap-2">
				<Link
					href="/dashboard"
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

			{voltarHref && (
				<Button variant="outline" size="sm" asChild className="shrink-0">
					<Link href={voltarHref}>
						<IconArrowLeft className="size-4" />
						<span className="hidden sm:inline">{voltarLabel}</span>
					</Link>
				</Button>
			)}
		</header>
	);
}
