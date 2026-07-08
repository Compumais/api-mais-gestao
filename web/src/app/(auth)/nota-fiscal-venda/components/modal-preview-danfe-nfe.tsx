"use client";

import { Download, ExternalLink } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ModalPreviewDanfeNfeProps {
	open: boolean;
	onClose: () => void;
	pdfBlob: Blob | null;
}

export function ModalPreviewDanfeNfe({
	open,
	onClose,
	pdfBlob,
}: ModalPreviewDanfeNfeProps) {
	const objectUrl = useMemo(() => {
		if (!pdfBlob) return null;
		return URL.createObjectURL(pdfBlob);
	}, [pdfBlob]);

	useEffect(() => {
		return () => {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [objectUrl]);

	function handleClose() {
		onClose();
	}

	function handleAbrirNovaAba() {
		if (!objectUrl) return;
		window.open(objectUrl, "_blank", "noopener,noreferrer");
	}

	function handleBaixar() {
		if (!objectUrl || !pdfBlob) return;
		const a = document.createElement("a");
		a.href = objectUrl;
		a.download = "preview-danfe-nfe.pdf";
		a.click();
	}

	return (
		<Dialog open={open} onOpenChange={(aberto) => !aberto && handleClose()}>
			<DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] max-w-5xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle>Pré-visualização do DANFE</DialogTitle>
				</DialogHeader>

				<div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
					Pré-visualização — documento sem valor fiscal. Nenhum dado foi enviado
					à SEFAZ.
				</div>

				<div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/20">
					{objectUrl ? (
						<iframe
							title="Pré-visualização DANFE"
							src={objectUrl}
							className="h-[min(70vh,720px)] w-full"
						/>
					) : (
						<div className="flex h-[min(70vh,720px)] items-center justify-center text-sm text-muted-foreground">
							PDF indisponível
						</div>
					)}
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={handleAbrirNovaAba}
							disabled={!objectUrl}
						>
							<ExternalLink className="h-4 w-4" />
							Abrir em nova aba
						</Button>
						<Button
							type="button"
							variant="outline"
							className="gap-2"
							onClick={handleBaixar}
							disabled={!objectUrl}
						>
							<Download className="h-4 w-4" />
							Baixar PDF
						</Button>
					</div>
					<Button type="button" onClick={handleClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
