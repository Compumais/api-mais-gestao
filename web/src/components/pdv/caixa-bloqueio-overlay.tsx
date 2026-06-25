"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCaixaPdv } from "@/hooks/use-caixa-pdv";
import { AbrirCaixaDialog } from "./abrir-caixa-dialog";

export function CaixaBloqueioOverlay() {
	const { estaAberto, isLoading } = useCaixaPdv();
	const [dialogAberto, setDialogAberto] = useState(false);

	if (isLoading || estaAberto) return null;

	return (
		<>
			<div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm p-6 text-center">
				<div className="max-w-md space-y-2">
					<h2 className="text-xl font-semibold">Caixa fechado</h2>
					<p className="text-sm text-muted-foreground">
						Abra o caixa para iniciar vendas no PDV. Nenhuma operação de venda
						está disponível enquanto o caixa estiver fechado.
					</p>
				</div>
				<Button size="lg" onClick={() => setDialogAberto(true)}>
					Abrir caixa
				</Button>
			</div>

			<AbrirCaixaDialog
				open={dialogAberto}
				onOpenChange={setDialogAberto}
			/>
		</>
	);
}
