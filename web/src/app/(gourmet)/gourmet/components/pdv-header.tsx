"use client";

import Link from "next/link";
import { useState } from "react";
import { IconArrowLeft, IconCash, IconLogout } from "@tabler/icons-react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";
import { useEmpresa } from "@/hooks/use-empresa";
import { getDefaultRouteForUser, isGarcom } from "@/lib/perfis";
import { AbrirCaixaDialog } from "./abrir-caixa-dialog";
import { FecharCaixaDialog } from "./fechar-caixa-dialog";

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
	const { logout, user } = useAuth();
	const { localStorageEmpresa: empresa } = useEmpresa();
	const { estaAberto, isLoading, numeropdv } = useCaixaPdv();
	const homeHref = getDefaultRouteForUser(user);
	const isGarcomUser = isGarcom(user);

	const [abrirDialog, setAbrirDialog] = useState(false);
	const [fecharDialog, setFecharDialog] = useState(false);

	return (
		<>
			<header className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
				<div className="flex items-center gap-3 min-w-0">
					<Link
						href={homeHref}
						className="flex items-center gap-2 text-primary shrink-0"
					>
						<CPlusIcon size={28} />
						{!isGarcomUser && (
							<span className="hidden font-semibold sm:inline">Mais Gestão</span>
						)}
					</Link>
					<span className="text-muted-foreground">/</span>
					<h1 className="text-sm font-semibold sm:text-base truncate">
						{titulo}
					</h1>
					{empresa && (
						<span className="hidden text-sm text-muted-foreground md:inline truncate">
							— {empresa.nome}
						</span>
					)}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{!isLoading && (
						<>
							<Badge
								variant={estaAberto ? "default" : "destructive"}
								className="hidden sm:inline-flex"
							>
								{estaAberto ? "Caixa aberto" : "Caixa fechado"}
							</Badge>
							<span className="hidden text-xs text-muted-foreground md:inline">
								PDV {numeropdv}
							</span>
							{estaAberto ? (
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									onClick={() => setFecharDialog(true)}
								>
									<IconCash className="size-4" />
									<span className="hidden sm:inline">Fechar caixa</span>
								</Button>
							) : (
								<Button
									size="sm"
									className="gap-1.5"
									onClick={() => setAbrirDialog(true)}
								>
									<IconCash className="size-4" />
									<span className="hidden sm:inline">Abrir caixa</span>
								</Button>
							)}
						</>
					)}

					<Button variant="outline" size="sm" asChild>
						<Link href={voltarHref}>
							<IconArrowLeft className="size-4" />
							<span className="hidden sm:inline">{voltarLabel}</span>
						</Link>
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

			<AbrirCaixaDialog open={abrirDialog} onOpenChange={setAbrirDialog} />
			<FecharCaixaDialog open={fecharDialog} onOpenChange={setFecharDialog} />
		</>
	);
}
