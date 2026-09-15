"use client";

import { DownloadIcon, ShareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function PwaInstallPrompt() {
	const {
		isVisible,
		isInstalling,
		showIosInstructions,
		canInstall,
		install,
		dismiss,
	} = usePwaInstall();

	if (!isVisible) return null;

	return (
		<section
			className="border-b bg-primary/10 px-4 py-3 text-sm"
			aria-label="Instalar aplicativo"
		>
			<div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-3">
					{showIosInstructions ? (
						<ShareIcon className="mt-0.5 size-4 shrink-0 text-primary" />
					) : (
						<DownloadIcon className="mt-0.5 size-4 shrink-0 text-primary" />
					)}
					<div>
						<p className="font-medium">
							Instale o Mais Gestão no seu dispositivo
						</p>
						<p className="text-muted-foreground">
							{showIosInstructions
								? "Toque em Compartilhar e depois em Adicionar à Tela de Início."
								: "Acesse o ERP com um toque, como um app nativo."}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
					{canInstall && (
						<Button
							size="sm"
							onClick={install}
							disabled={isInstalling}
							aria-busy={isInstalling}
						>
							{isInstalling ? "Instalando..." : "Instalar"}
						</Button>
					)}
					<Button size="sm" variant="outline" onClick={dismiss}>
						Agora não
					</Button>
					<Button
						size="icon-sm"
						variant="ghost"
						onClick={dismiss}
						aria-label="Fechar sugestão de instalação"
					>
						<XIcon className="size-4" />
					</Button>
				</div>
			</div>
		</section>
	);
}
