"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAlertaVencimentoCertificado } from "@/hooks/use-alerta-vencimento-certificado";
import { cn } from "@/lib/utils";

interface AlertaVencimentoCertificadoProps {
	idempresa?: string | null;
	variante?: "padrao" | "barra";
	className?: string;
}

export function AlertaVencimentoCertificado({
	idempresa,
	variante = "padrao",
	className,
}: AlertaVencimentoCertificadoProps) {
	const { avaliacao, mostrarAlerta } =
		useAlertaVencimentoCertificado(idempresa);

	if (!mostrarAlerta || !avaliacao) return null;

	const Icone = avaliacao.critico ? ShieldAlert : AlertTriangle;

	if (variante === "barra") {
		return (
			<div
				className={cn(
					"flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs sm:text-sm",
					avaliacao.critico
						? "border-destructive/40 bg-destructive/15 text-destructive"
						: "border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-amber-100",
					className,
				)}
				role="alert"
			>
				<div className="flex min-w-0 items-center gap-2">
					<Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span className="truncate">
						<strong>{avaliacao.titulo}</strong> — {avaliacao.descricao}
					</span>
				</div>
				<Button
					variant="outline"
					size="sm"
					asChild
					className="h-7 shrink-0 px-2.5 text-xs"
				>
					<Link href="/configuracoes?tab=nfe">Atualizar certificado</Link>
				</Button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
				avaliacao.critico
					? "border-destructive/40 bg-destructive/10 text-destructive"
					: "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
				className,
			)}
			role="alert"
		>
			<div className="flex min-w-0 items-start gap-3">
				<Icone
					className={cn(
						"mt-0.5 h-5 w-5 shrink-0",
						avaliacao.critico
							? "text-destructive"
							: "text-amber-600 dark:text-amber-400",
					)}
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<span className="font-semibold">{avaliacao.titulo}</span>
					{" — "}
					<span>{avaliacao.descricao}</span>
				</div>
			</div>
			<Button variant="outline" size="sm" asChild className="shrink-0">
				<Link href="/configuracoes?tab=nfe">Atualizar certificado</Link>
			</Button>
		</div>
	);
}
