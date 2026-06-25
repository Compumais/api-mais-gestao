"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";

interface AbrirCaixaDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AbrirCaixaDialog({ open, onOpenChange }: AbrirCaixaDialogProps) {
	const { abrirCaixa, isAbrindo, numeropdv } = useCaixaPdv();
	const [suprimento, setSuprimento] = useState("");

	useEffect(() => {
		if (!open) setSuprimento("");
	}, [open]);

	const handleConfirmar = async () => {
		await abrirCaixa(suprimento || "0");
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Abrir caixa</DialogTitle>
					<DialogDescription>
						PDV nº {numeropdv} — informe o suprimento inicial em dinheiro para
						iniciar o turno.
					</DialogDescription>
				</DialogHeader>

				<Field>
					<FieldLabel>Suprimento inicial</FieldLabel>
					<FieldGroup>
						<MoneyInput
							value={suprimento}
							onChange={setSuprimento}
							placeholder="R$ 0,00"
							autoFocus
						/>
					</FieldGroup>
				</Field>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isAbrindo}
					>
						Cancelar
					</Button>
					<Button onClick={handleConfirmar} disabled={isAbrindo}>
						{isAbrindo ? "Abrindo..." : "Abrir caixa"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
