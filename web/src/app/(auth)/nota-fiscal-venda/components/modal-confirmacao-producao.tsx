"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ModalConfirmacaoProducaoProps {
	open: boolean;
	onClose: () => void;
	onConfirmar: () => void;
	carregando?: boolean;
}

export function ModalConfirmacaoProducao({
	open,
	onClose,
	onConfirmar,
	carregando = false,
}: ModalConfirmacaoProducaoProps) {
	const [confirmado, setConfirmado] = useState(false);

	function handleClose() {
		setConfirmado(false);
		onClose();
	}

	function handleConfirmar() {
		if (!confirmado) return;
		onConfirmar();
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-red-700">
						<AlertTriangle className="h-5 w-5" />
						Emissão em Produção
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<p className="text-sm text-muted-foreground">
						Você está prestes a emitir uma <strong>Nota Fiscal Eletrônica com
						validade fiscal real</strong>. Essa ação é irreversível e a nota será
						transmitida para a SEFAZ.
					</p>

					<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
						<ul className="space-y-1 list-disc list-inside">
							<li>A NF-e terá validade jurídica e fiscal</li>
							<li>Não será possível cancelar após 24 horas</li>
							<li>Certifique-se de que todos os dados estão corretos</li>
						</ul>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox
							id="confirmar-producao"
							checked={confirmado}
							onCheckedChange={(v) => setConfirmado(v === true)}
						/>
						<Label htmlFor="confirmar-producao" className="text-sm cursor-pointer">
							Confirmo que esta NF-e possui validade fiscal real e os dados estão
							corretos
						</Label>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={carregando}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirmar}
						disabled={!confirmado || carregando}
					>
						{carregando ? "Emitindo..." : "Emitir em Produção"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
