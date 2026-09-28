"use client";

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

type DialogConfirmarEmitirNfceLoteProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: () => void;
	carregando?: boolean;
	quantidade: number;
};

export function DialogConfirmarEmitirNfceLote({
	open,
	onClose,
	onConfirmar,
	carregando = false,
	quantidade,
}: DialogConfirmarEmitirNfceLoteProps) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(aberto) => {
				if (!aberto && !carregando) onClose();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Emitir NFC-e em lote ({quantidade})
					</AlertDialogTitle>
					<AlertDialogDescription>
						As vendas selecionadas serão convertidas em NFC-e sequencialmente.
						Cada venda reserva sua própria numeração. Rejeições da SEFAZ não
						interrompem o lote — as demais vendas continuam sendo processadas.
						Ao final você verá o relatório de sucessos e falhas.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={carregando} onClick={onClose}>
						Voltar
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={carregando || quantidade < 1}
						onClick={(e) => {
							e.preventDefault();
							onConfirmar();
						}}
					>
						{carregando ? "Emitindo…" : "Confirmar emissão"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
