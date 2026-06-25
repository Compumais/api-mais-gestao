"use client";

import { useState } from "react";
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
import {
	TAMANHO_MINIMO_JUSTIFICATIVA_NFE,
	validarJustificativaEventoNfe,
} from "@/util/validar-eventos-nfe";

type ModalEventoNfeProps = {
	open: boolean;
	onClose: () => void;
	onConfirmar: (justificativa: string) => void;
	carregando?: boolean;
	titulo: string;
	descricao: string;
	rotuloConfirmar: string;
};

export function ModalEventoNfe({
	open,
	onClose,
	onConfirmar,
	carregando = false,
	titulo,
	descricao,
	rotuloConfirmar,
}: ModalEventoNfeProps) {
	const [justificativa, setJustificativa] = useState("");
	const erro = validarJustificativaEventoNfe(justificativa);
	const caracteres = justificativa.trim().length;

	function handleClose() {
		setJustificativa("");
		onClose();
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(aberto) => {
				if (!aberto) handleClose();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{titulo}</AlertDialogTitle>
					<AlertDialogDescription>{descricao}</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-2 py-2">
					<Textarea
						value={justificativa}
						onChange={(e) => setJustificativa(e.target.value)}
						placeholder="Descreva o motivo com clareza (mínimo 15 caracteres)"
						rows={4}
						maxLength={255}
					/>
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>
							{caracteres}/{TAMANHO_MINIMO_JUSTIFICATIVA_NFE} caracteres mínimos
						</span>
						<span>{justificativa.length}/255</span>
					</div>
					{erro && justificativa.length > 0 && (
						<p className="text-xs text-destructive">{erro}</p>
					)}
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={carregando} onClick={handleClose}>
						Voltar
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={carregando || Boolean(erro) || !justificativa.trim()}
						onClick={(e) => {
							e.preventDefault();
							onConfirmar(justificativa.trim());
						}}
					>
						{carregando ? "Processando..." : rotuloConfirmar}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
