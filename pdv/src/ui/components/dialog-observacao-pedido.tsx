import { useEffect, useState } from "react";
import {
	LIMITE_OBSERVACAO_PEDIDO,
	normalizarObservacaoPedido,
} from "@/lib/observacao-pedido";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export function DialogObservacaoPedido({
	aberto,
	loading,
	onCancelar,
	onConfirmar,
}: {
	aberto: boolean;
	loading?: boolean;
	onCancelar: () => void;
	onConfirmar: (observacao: string | null) => void;
}) {
	const [texto, setTexto] = useState("");
	useEscapeFechaModal(aberto, onCancelar);

	useEffect(() => {
		if (aberto) setTexto("");
	}, [aberto]);

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<form
				className="pdv-surface w-full max-w-md space-y-4 p-5"
				onSubmit={(e) => {
					e.preventDefault();
					onConfirmar(normalizarObservacaoPedido(texto));
				}}
			>
				<div>
					<h2 className="text-lg font-semibold">Observação do pedido</h2>
					<p className="text-sm text-muted-foreground">
						Será impressa junto com o pedido de produção (opcional).
					</p>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="observacao-pedido">Observação</Label>
					<textarea
						id="observacao-pedido"
						autoFocus
						rows={4}
						maxLength={LIMITE_OBSERVACAO_PEDIDO}
						value={texto}
						disabled={loading}
						onChange={(e) => setTexto(e.target.value)}
						placeholder="Ex.: sem pimenta, urgente, aniversário"
						className="flex min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
					/>
					<p className="text-right text-xs text-muted-foreground">
						{texto.trim().length}/{LIMITE_OBSERVACAO_PEDIDO}
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						disabled={loading}
						onClick={onCancelar}
					>
						Cancelar
					</Button>
					<Button type="submit" className="flex-1" disabled={loading}>
						{loading ? "Enviando..." : "Adicionar itens"}
					</Button>
				</div>
			</form>
		</div>
	);
}
