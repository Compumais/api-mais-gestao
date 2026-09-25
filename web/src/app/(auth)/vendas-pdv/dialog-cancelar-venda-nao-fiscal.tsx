"use client";

import { useEffect, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

type DialogCancelarVendaNaoFiscalProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (motivo: string | null) => void;
	carregando?: boolean;
	numeropdv?: number | null;
};

export function DialogCancelarVendaNaoFiscal({
	open,
	onClose,
	onConfirmar,
	carregando = false,
	numeropdv,
}: DialogCancelarVendaNaoFiscalProps) {
	const [motivo, setMotivo] = useState("");

	useEffect(() => {
		if (!open) setMotivo("");
	}, [open]);

	function handleClose() {
		setMotivo("");
		onClose();
	}

	const motivoTrim = motivo.trim();
	const motivoInvalido = motivoTrim.length > 255;

	return (
		<AlertDialog
			open={open}
			onOpenChange={(aberto) => {
				if (!aberto) handleClose();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Cancelar venda não fiscal
						{numeropdv != null ? ` nº ${numeropdv}` : ""}
					</AlertDialogTitle>
					<AlertDialogDescription>
						Estorna estoque e cancela títulos financeiros nesta venda. Não há
						prazo de cancelamento (sem envio à SEFAZ). Esta ação não cancela
						NFC-e autorizada.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-2 py-2">
					<Textarea
						value={motivo}
						onChange={(e) => setMotivo(e.target.value)}
						placeholder="Motivo (opcional)"
						rows={3}
						maxLength={255}
						disabled={carregando}
					/>
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>Opcional</span>
						<span>{motivo.length}/255</span>
					</div>
					{motivoInvalido ? (
						<p className="text-xs text-destructive">
							O motivo deve ter no máximo 255 caracteres
						</p>
					) : null}
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={carregando} onClick={handleClose}>
						Voltar
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={carregando || motivoInvalido}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						onClick={(e) => {
							e.preventDefault();
							onConfirmar(motivoTrim || null);
						}}
					>
						{carregando ? "Cancelando…" : "Confirmar cancelamento"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
