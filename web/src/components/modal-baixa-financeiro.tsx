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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function dataHojeIso() {
	return new Date().toISOString().split("T")[0] ?? "";
}

type ModalBaixaFinanceiroProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	quantidade: number;
	onConfirm: (dataBaixa: string) => void;
	isPending?: boolean;
};

export function ModalBaixaFinanceiro({
	open,
	onOpenChange,
	quantidade,
	onConfirm,
	isPending = false,
}: ModalBaixaFinanceiroProps) {
	const [dataBaixa, setDataBaixa] = useState(dataHojeIso);

	useEffect(() => {
		if (open) {
			setDataBaixa(dataHojeIso());
		}
	}, [open]);

	const handleConfirm = () => {
		if (!dataBaixa) return;
		onConfirm(dataBaixa);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Dar baixa</DialogTitle>
					<DialogDescription>
						{quantidade === 1
							? "Informe a data de baixa para o documento selecionado."
							: `Informe a data de baixa para os ${quantidade} documentos selecionados.`}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 py-2">
					<Label htmlFor="data-baixa">Data de baixa</Label>
					<Input
						id="data-baixa"
						type="date"
						value={dataBaixa}
						onChange={(e) => setDataBaixa(e.target.value)}
						disabled={isPending}
					/>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!dataBaixa || isPending || quantidade < 1}
					>
						{isPending ? "Processando..." : "Confirmar baixa"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
